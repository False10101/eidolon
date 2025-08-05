import { r2 } from "@/lib/r2";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { queryWithRetry } from "@/lib/queryWithQuery";
import { db } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

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

// ONLY ADDITION: Transaction retry helper
async function executeTransactionWithRetry(operations, maxRetries = 3) {
    let connection;
    let attempts = 0;
    let lastError;

    while (attempts < maxRetries) {
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();
            
            for (const op of operations) {
                await connection.execute(op.sql, op.params);
            }
            
            await connection.commit();
            return;
        } catch (err) {
            if (connection) await connection.rollback();
            lastError = err;
            attempts++;
            if (attempts < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        } finally {
            if (connection) connection.release();
        }
    }
    throw lastError;
}

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
    let tempFilePath;
    let googleUploadedFile;
    let genAI;

    try {
        const [rows] = await queryWithRetry('SELECT * FROM textbook WHERE id= ?', [textbookId]);
        textbook = rows[0];

        const [secondrows] = await queryWithRetry('SELECT gemini_api from user WHERE id = ? ', [user_id]);
        const gemini_api_key = secondrows[0]?.gemini_api;

        if (!textbook) {
            throw new Error(`Textbook with ID ${textbookId} not found for processing.`);
        }

        // ONLY CHANGE: Wrapped in retry helper
        await executeTransactionWithRetry([
            {
                sql: `UPDATE textbook SET status = 'PROCESSING' WHERE id = ?`,
                params: [textbookId]
            },
            {
                sql: `UPDATE activity SET status = 'PROCESSING' WHERE type = 'Textbook Explainer' AND respective_table_id = ? AND id = ?`,
                params: [textbookId, activityId]
            }
        ]);

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

        // Rest of your original processing code remains exactly the same...
        const textPath = textbook.textbookTXTFilePath.startsWith('/')
            ? textbook.textbookTXTFilePath.slice(1)
            : textbook.textbookTXTFilePath;

        const { Body: textBody } = await r2.send(new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: textPath
        }));

        const rawText = await textBody.transformToString();

        console.log("Downloading original PDF from R2...");
        const originalFilePath = textbook.originalFilePath.startsWith('/')
            ? textbook.originalFilePath.slice(1)
            : textbook.originalFilePath;
        const { Body: originalFileBody } = await r2.send(new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: originalFilePath
        }));
        const pdfBodyBuffer = Buffer.from(await originalFileBody.transformToByteArray());
        console.log("PDF downloaded into memory.");

        tempFilePath = path.join('/tmp', `${uuidv4()}.pdf`);
        console.log(`Creating temporary file at: ${tempFilePath}`);
        await fs.writeFile(tempFilePath, pdfBodyBuffer);
        console.log("Temporary file created.");

        const genAI = new GoogleGenAI({
            apiKey: gemini_api_key,
            authClient: null
        });

        const uploadResponse = await genAI.files.upload({
            file: tempFilePath,
            config: {
                mimeType: "application/pdf",
                fileName: tempFilePath
            }
        });

        googleUploadedFile = uploadResponse.file;
        console.log("File uploaded successfully. Name:", uploadResponse.uri);

        const result = await genAI.models.generateContentStream({
            model: 'gemini-2.5-pro',
            contents: [
                createUserContent([
                    buildUserPrompt("", formatOptionsJSON),
                    createPartFromUri(uploadResponse.uri, uploadResponse.mimeType)
                ])
            ],
            generationConfig: {
                maxOutputTokens: 65000,
                topP: 0.95
            }
        });

        let generatedText = "";
        for await (const chunk of result) {
            generatedText += chunk.text;
        }

        const pageCount = await getPdfPageCount(tempFilePath);
        const estimatedInputTokens = pageCount * 258;
        const outputTokens = Math.floor(generatedText.length / 4);

        console.log(`Input Tokens: ${estimatedInputTokens}`);
        console.log(`Output Tokens: ${outputTokens}`);
        console.log(`Total Tokens: ${estimatedInputTokens + outputTokens}`);

        console.log("Gemini API call finished.");

        console.log("Starting PDF generation...");

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

        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: pdfRelativePath,
            Body: pdfBuffer,
            ContentType: 'application/pdf'
        }));

        console.log(`✅ PDF uploaded to R2: ${pdfRelativePath}`);

        // ONLY CHANGE: Wrapped in retry helper
        await executeTransactionWithRetry([
            {
                sql: `UPDATE textbook SET status = 'COMPLETED', explanationFilePath = ? WHERE id = ?`,
                params: [`/${pdfRelativePath}`, textbookId]
            },
            {
                sql: `UPDATE activity SET status = 'COMPLETED', token_sent = ?, token_received = ? WHERE type = 'Textbook Explainer' AND respective_table_id = ? AND id = ?`,
                params: [estimatedInputTokens, outputTokens, textbookId, activityId]
            }
        ]);

        console.log(`Successfully processed textbook ID: ${textbookId}`);

    } catch (error) {
        console.error("An error occurred during textbook processing:", error);
        
        // ONLY CHANGE: Wrapped in retry helper
        if (textbookId) {
            await executeTransactionWithRetry([
                {
                    sql: `UPDATE textbook SET status = 'FAILED' WHERE id = ?`,
                    params: [textbookId]
                },
                {
                    sql: `UPDATE activity SET status = 'FAILED' WHERE type = 'Textbook Explainer' AND respective_table_id = ? AND id = ?`,
                    params: [textbookId, activityId]
                }
            ]).catch(err => console.error('Failed to update failure status:', err));
        }
    } finally {
        if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error);
        if (googleUploadedFile) {
            try {
                await genAI.files.delete({ name: googleUploadedFile.name });
            } catch (e) {
                console.error('Error deleting Gemini file:', e);
            }
        }
    }
}

function buildUserPrompt(rawText, formatOptionsJSON) {
    const basePrompt = `You are an expert technical writer and editor. Your task is to rewrite dense and complex textbook content into a clear, concise, and sequentially structured explanation.

**Your Core Mission:**
* **Strict Sequential Processing:** You **must** process the input slide by slide. Do not summarize the entire document. Address all content on one slide before moving to the next.
* **Structure with Headings:** For each \`[Slide X]\` in the input, you **must** start your explanation with a markdown heading like \`### Slide X: [Inferred Topic of the Slide]\`.
* **Rewrite for Clarity:** Under each heading, rewrite the slide's content. Your main job is to rephrase academic jargon and complicated sentences into plain, understandable English.
* **Explain Each Point:** Address every subtopic, bullet point, or code block on the slide. Explain its meaning and high-level purpose.

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
${rawText}`;

    return finalPrompt.replace(/^\s*[\r\n]/gm, '');
}

async function getPdfPageCount(filePath) {
    try {
        const pdfBytes = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        return pdfDoc.getPageCount();
    } catch (error) {
        console.error('Error counting PDF pages:', error);
        return 0;
    }
}