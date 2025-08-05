import { r2 } from "@/lib/r2";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { queryWithRetry } from "@/lib/queryWithQuery";
import { db } from '@/lib/db';

const PDF_CSS = `
  body { font-family: "Segoe UI", "Helvetica Neue", "Arial", sans-serif; font-size: 15px; line-height: 1.75; color: #111; background-color: white; padding: 3em; max-width: 800px; margin: auto; }
  h1, h2, h3 { font-weight: 700; color: #2c3e50; margin-top: 2em; margin-bottom: 1em; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  h3 { font-size: 18px; }
  p { margin: 1em 0; }
  code, pre { font-family: "Courier New", monospace; background-color: #f5f5f5; padding: 0.2em 0.4em; font-size: 0.9em; border-radius: 4px; }
  .page-break { page-break-after: always; }
`;

function buildTitlePage(title, course, author, date) {
    return `
    <div style="text-align: center; margin-top: 150px; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;" class="page-break">
        <h1 style="font-size: 32px;">${title}</h1>
        <h2 style="margin-top: 30px; font-weight: normal;">${course}</h2>
        <h3 style="margin-top: 10px; font-weight: normal;">${author}</h3>
        <p style="margin-top: 40px; font-size: 18px;">${date}</p>
    </div>
    `;
}

export async function textbook_explanation_processor(textbookId, activityId, user_id) {
    let textbook;
    let connection;

    try {
        const [rows] = await queryWithRetry('SELECT * FROM textbook WHERE id= ?', [textbookId]);
        textbook = rows[0];

        const [secondrows] = await queryWithRetry('SELECT gemini_api from user WHERE id = ? ', [user_id]);

        const gemini_api_key = secondrows[0]?.gemini_api;

        if (!textbook) {
            throw new Error(`Textbook with ID ${textbookId} not found for processing.`);
        }

        connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute(`UPDATE textbook SET status = 'PROCESSING' WHERE id = ?`, [textbookId]);
            await connection.execute(
                `UPDATE activity SET status = 'PROCESSING' WHERE type = 'Textbook Explainer' AND respective_table_id = ? AND id = ?`, 
                [textbookId, activityId]
            );
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }

        const formatOptionsJSON = {
            simple_analogies: Boolean(textbook.simple_analogies),
            key_people: Boolean(textbook.key_people),
            historical_timelines: Boolean(textbook.historical_timelines),
            flashcards: Boolean(textbook.flashcards),
            practice_questions: Boolean(textbook.practice_questions),
            cross_references: Boolean(textbook.cross_references),
            references: Boolean(textbook.references),
            instructions: Boolean(textbook.instructions),
        };

        // Read text file from R2
        const textPath = textbook.textbookTXTFilePath.startsWith('/') 
            ? textbook.textbookTXTFilePath.slice(1) 
            : textbook.textbookTXTFilePath;

        const originalFilePath = textbook.originalFilePath.startsWith('/')
            ? textbook.originalFilePath.slice(1)
            : textbook.originalFilePath;
        
        const { Body: textBody } = await r2.send(new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: textPath
        }));

        const { Body: originalFileBody } = await r2.send(new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: originalFilePath
        }))
        const rawText = await textBody.transformToString();

        const pdfBody = await originalFileBody.transformToString('base64');

        const genAI = new GoogleGenAI({
            apiKey: gemini_api_key,
            authClient: null  
        });

        console.log("Start generation")

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ 
                    role: "user",
                    parts: [
                        {text: buildUserPrompt(formatOptionsJSON) },
                        {inlineData : {
                            mimeType: 'application/pdf',
                            data: pdfBody
                        }}
                    ]
                    
                }],
            generationConfig: {
                maxOutputTokens: 65000,
                topP: 0.95
            }
        });

        console.log("End generation")

        const generatedText = result.text;
        const usageMetadata = result.usageMetadata;

        if (usageMetadata) {
            console.log(`Input Tokens: ${usageMetadata.promptTokenCount}`);
            console.log(`Output Tokens: ${usageMetadata.candidatesTokenCount}`);
            console.log(`Total Tokens: ${usageMetadata.totalTokenCount}`);
        }
        console.log("Gemini API call finished.");

        console.log("Starting PDF generation...");

        // Generate PDF
        const pdfFileName = `${uuidv4()}_${textbook.name}_explained.pdf`;
        const pdfRelativePath = `textbook/explanation/${pdfFileName}`;
        const generationDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const titlePageHtml = buildTitlePage(textbook.name || "Generated Explanation", textbook.course || "Textbook Analysis", "A.I. Companion", generationDate);
        const contentHtml = marked(generatedText);
        const finalHtml = titlePageHtml + contentHtml;

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        await page.addStyleTag({ content: PDF_CSS });
        
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        
        console.log(`✅ PDF created in memory`);

        // Upload PDF to R2
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: pdfRelativePath,
            Body: pdfBuffer,
            ContentType: 'application/pdf'
        }));

        console.log(`✅ PDF uploaded to R2: ${pdfRelativePath}`);

        connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute(
                `UPDATE textbook SET status = 'COMPLETED', explanationFilePath = ? WHERE id = ?`,
                [`/${pdfRelativePath}`, textbookId]
            );
            await connection.execute(
                `UPDATE activity SET status = 'COMPLETED', token_sent = ?, token_received = ? 
                 WHERE type = 'Textbook Explainer' AND respective_table_id = ? AND id = ?`,
                [usageMetadata.promptTokenCount, usageMetadata.candidatesTokenCount, textbookId, activityId]
            );
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }

        console.log(`Successfully processed textbook ID: ${textbookId}`);

    } catch (error) {
        console.error("An error occurred during textbook processing:", error);
        if (textbookId) {
            connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                await connection.execute(
                    `UPDATE textbook SET status = 'FAILED' WHERE id = ?`,
                    [textbookId]
                );
                await connection.execute(
                    `UPDATE activity SET status = 'FAILED' 
                     WHERE type = 'Textbook Explainer' AND respective_table_id = ? AND id = ?`,
                    [textbookId, activityId]
                );
                await connection.commit();
            } catch (err) {
                await connection.rollback();
                console.error('Error updating failed status:', err);
            } finally {
                if (connection) connection.release();
            }
        }
    }
}

function buildUserPrompt( formatOptionsJSON) {
    const basePrompt = `You are an expert technical writer and editor. Your task is to rewrite dense and complex textbook content into a clear, concise, and sequentially structured explanation.

**Your Core Mission:**
* **Strict Sequential Processing:** You **must** process the input slide by slide. Do not summarize the entire document. Address all content on one slide before moving to the next.
* **Structure with Headings:** For each \`[Slide X]\` in the input, you **must** start your explanation with a markdown heading like \`### Slide X: [Inferred Topic of the Slide]\`.
* **Rewrite for Clarity:** Under each heading, rewrite the slide's content. Your main job is to rephrase academic jargon and complicated sentences into plain, understandable English.
* **Explain Each Point:** Address every subtopic, bullet point, or code block on the slide. Explain its meaning and high-level purpose.
* **Be Concise:** Provide enough detail to be clear, but avoid unnecessary verbosity. Focus on the core information presented on the slide.

**What to Avoid:**
* **Do not** group multiple slides under one explanation.
* **Avoid** adding tangential topics, deep historical dives, or exhaustive line-by-line code analysis.`;

    const finalPrompt = `${basePrompt}
${formatOptionsJSON.key_people ? "→ If a key person is mentioned, briefly state their contribution." : ""}
${formatOptionsJSON.historical_timelines ? "→ If the text discusses historical context, briefly summarize it." : ""}
${formatOptionsJSON.cross_references ? "→ If the text explicitly references another concept, maintain that reference." : ""}
${formatOptionsJSON.flashcards ? "→ At the very end of your entire response, add a section '### Key Terms' with simple definitions." : ""}
${formatOptionsJSON.practice_questions ? "→ At the very end of your entire response, add a section '### Review Questions' with a few questions based on the content." : ""}
${formatOptionsJSON.references ? "→ If the original text includes sources, list them in a '### References' section at the end." : ""}

---
`;

    return finalPrompt.replace(/^\s*[\r\n]/gm, '');
}