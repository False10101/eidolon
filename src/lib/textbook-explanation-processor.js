import { db } from "@/lib/db";
import { GoogleGenAI } from "@google/genai";
import { readFile } from 'fs/promises';
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import { marked } from 'marked';

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

export async function textbook_explanation_processor(textbookId) {
    let textbook;

    try {
        const [rows] = await queryWithRetry('SELECT * FROM textbook WHERE id= ?', [textbookId]);

        textbook = rows[0];

        if (!textbook) {
            throw new Error(`Textbook with ID ${textbookId} not found for processing.`);
        }

        await queryWithRetry(`UPDATE textbook SET status = 'PROCESSING' WHERE id = ?`, [textbookId]);

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

        const textFilePath = path.join(process.cwd(), 'public', textbook.textbookTXTFilePath);
        const rawText = await readFile(textFilePath, 'utf-8');

        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ role: "user", parts: [{ text: buildUserPrompt(rawText, formatOptionsJSON) }] }],
            generationConfig: {
                maxOutputTokens: 55000,
                topP: 0.95
            }
        })

        const generatedText = result.text;
        const usageMetadata = result.usageMetadata;

        if (usageMetadata) {
            console.log(`Input Tokens: ${usageMetadata.promptTokenCount}`);
            console.log(`Output Tokens: ${usageMetadata.candidatesTokenCount}`);
            console.log(`Total Tokens: ${usageMetadata.totalTokenCount}`);
        }
        console.log("Gemini API call finished.");

        console.log("Starting PDF generation...");

        // 1. Prepare PDF metadata and file paths
        const pdfFileName = `${uuidv4()}_${textbook.name}_explained.pdf`;
        const pdfRelativePath = `/textbook/explanation/${pdfFileName}`;
        const pdfAbsoluteFilePath = path.join(process.cwd(), 'public', pdfRelativePath);
        const generationDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // 2. Build HTML from your `generatedText`
        const titlePageHtml = buildTitlePage(textbook.name || "Generated Explanation", textbook.course || "Textbook Analysis", "A.I. Companion", generationDate);
        const contentHtml = marked(generatedText);
        const finalHtml = titlePageHtml + contentHtml;

        // 3. Use Puppeteer to create the PDF from the HTML string
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        await page.addStyleTag({ content: PDF_CSS });
        await page.pdf({ path: pdfAbsoluteFilePath, format: 'A4', printBackground: true });
        await browser.close();
        
        console.log(`✅ PDF created: ${pdfFileName}`);

        await queryWithRetry(`UPDATE textbook SET status = 'COMPLETED', explanationFilePath = ? WHERE id = ? `, [pdfRelativePath, textbookId]);

        console.log(`Successfully processed textbook ID: ${textbookId}`);

    } catch (error) {
        console.error("An error occurred during textbook processing:", error);
        if (textbookId) {
            await queryWithRetry(`UPDATE textbook SET status = 'FAILED' WHERE id = ?`, [textbookId]);
        }
    }
}

async function queryWithRetry(query, values) {
  try {
    return await db.query(query, values);
  } catch (err) {
    // If it's a timeout or connection reset error, try one more time.
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
      console.log('Database connection timed out. Retrying once...');
      return await db.query(query, values);
    }
    // For all other errors, throw them immediately.
    throw err;
  }
}
function buildUserPrompt(rawText, formatOptionsJSON) {
    // A prompt that enforces slide-by-slide processing while remaining concise.
    const basePrompt = `You are an expert technical writer and editor. Your task is to rewrite dense and complex textbook content into a clear, concise, and sequentially structured explanation.

**Your Core Mission:**
* **Strict Sequential Processing:** You **must** process the input slide by slide. Do not summarize the entire document. Address all content on one slide before moving to the next.
* **Structure with Headings:** For each \`[Slide X]\` in the input, you **must** start your explanation with a markdown heading like \`### Slide X: [Inferred Topic of the Slide]\`.
* **Rewrite for Clarity:** Under each heading, rewrite the slide's content. Your main job is to rephrase academic jargon and complicated sentences into plain, understandable English.
* **Explain Each Point:** Address every subtopic, bullet point, or code block on the slide. Explain its meaning and high-level purpose.
* **Be Concise:** Provide enough detail to be clear, but avoid unnecessary verbosity. Focus on the core information presented on the slide.

**What to Avoid:**
* **Do not** group multiple slides under one explanation.
* **Avoid** adding tangential topics, deep historical dives, or exhaustive line-by-line code analysis.

Your task is to act as a clarifier, rewriting the material for each slide in order. Now, begin.`;

    // Dynamically build the final prompt using inline ternary operators
    const finalPrompt = `${basePrompt}
${/* Add each instruction on a new line if its option is true */''}
${formatOptionsJSON.key_people ? "→ If a key person is mentioned, briefly state their contribution." : ""}
${formatOptionsJSON.historical_timelines ? "→ If the text discusses historical context, briefly summarize it." : ""}
${formatOptionsJSON.cross_references ? "→ If the text explicitly references another concept, maintain that reference." : ""}
${formatOptionsJSON.flashcards ? "→ At the very end of your entire response, add a section '### Key Terms' with simple definitions." : ""}
${formatOptionsJSON.practice_questions ? "→ At the very end of your entire response, add a section '### Review Questions' with a few questions based on the content." : ""}
${formatOptionsJSON.references ? "→ If the original text includes sources, list them in a '### References' section at the end." : ""}

---
${rawText}`;

    // The .replace() call cleans up any blank lines created if an option is false
    return finalPrompt.replace(/^\s*[\r\n]/gm, '');
}