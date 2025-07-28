import { r2 } from "@/lib/r2"; // Import R2 client
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"; // Import S3 commands
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { queryWithRetry } from "@/lib/queryWithQuery";
import { db } from '@/lib/db';

/**
 * This function runs the long note-generation process in the background.
 * @param {number} noteId - The ID of the note record to process.
 */
export async function processNoteInBackground(noteId, activityId, user_id) {
    let note;
    let connection;
    try {
        // Step 1: Fetch the job details from the database.
        const [rows] = await queryWithRetry('SELECT * FROM note WHERE id = ?', [noteId]);
        note = rows[0];

        const [secondrows] = await queryWithRetry('SELECT gemini_api from user WHERE id = ? ', [user_id]);

        const gemini_api_key = secondrows[0]?.gemini_api;

        if (!note) {
            throw new Error(`Note with ID ${noteId} not found for processing.`);
        }

        connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            // Step 2: Update the status to 'PROCESSING' in both note and activity tables
            await connection.execute(`UPDATE note SET status = 'PROCESSING' WHERE id = ?`, [noteId]);
            await connection.execute(`UPDATE activity SET status = 'PROCESSING' WHERE type = 'Inclass Notes' AND respective_table_id = ? AND id = ? `, [noteId, activityId]);
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err; 
        } finally {
            if (connection) connection.release();
        }

        const configJSON = {
            detect_heading: Boolean(note.detect_heading),
            highlight_key: Boolean(note.highlight_key),
            identify_todo: Boolean(note.identify_todo),
            detect_definitions: Boolean(note.detect_definitions),
            include_summary: Boolean(note.include_summary),
            extract_key_in_summary: Boolean(note.extract_key_in_summary),
        };

        const temperatureParam = note.style === 'minimal' ? 0.3 : note.style === "creative" ? 1 : 0.6;

        // Step 3: Read the transcript file from R2
        const transcriptPath = note.transcriptFilePath.startsWith('/') 
            ? note.transcriptFilePath.slice(1) 
            : note.transcriptFilePath;
        
        const { Body: transcriptBody } = await r2.send(new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: transcriptPath
        }));
        const transcriptText = await transcriptBody.transformToString();

        // Step 4: Construct the prompt and call the Gemini API
        const genAI = new GoogleGenAI({
            apiKey: gemini_api_key,
            authClient: null  
        });

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ role: "user", parts: [{ text: buildUserPrompt(transcriptText, configJSON) }] }],
            generationConfig: {
                maxOutputTokens: 65000,
                temperature: temperatureParam,
                topP: 0.95
            }
        });

        const generatedText = result.text;
        const usageMetadata = result.usageMetadata;

        if (usageMetadata) {
            console.log(`Input Tokens: ${usageMetadata.promptTokenCount}`);
            console.log(`Output Tokens: ${usageMetadata.candidatesTokenCount}`);
            console.log(`Total Tokens: ${usageMetadata.totalTokenCount}`);
        }
        console.log("Gemini API call finished.");

        // Step 5: Save the generated note text to R2
        const uniqueNotesFileName = `${uuidv4()}_${note.name}_notes.txt`;
        const notesRelativePath = `note/${uniqueNotesFileName}`; // No leading slash for R2
        
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: notesRelativePath,
            Body: generatedText,
            ContentType: 'text/plain'
        }));

        connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            // Step 6: Update both note and activity tables with completion status and token counts
            await connection.execute(
                `UPDATE activity SET token_sent = ?, token_received = ?, status = 'COMPLETED' WHERE type = 'Inclass Notes' AND respective_table_id = ? AND id = ?`,
                [usageMetadata.promptTokenCount, usageMetadata.candidatesTokenCount, noteId, activityId]
            );
            await connection.execute(
                `UPDATE note SET status = 'COMPLETED', noteFilePath = ? WHERE id = ?`,
                [`/${notesRelativePath}`, noteId] // Add leading slash for DB consistency
            );
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err; 
        } finally {
            if (connection) connection.release();
        }

        console.log(`Successfully processed note ID: ${noteId}`);

    } catch (error) {
        console.error(`Failed to process note ID ${noteId}:`, error);
        // Step 7 (Error Handling): Update both note and activity records to 'FAILED'
        if (noteId) {
            const errorMessage = error.message.includes('SAFETY') 
                ? 'Content blocked by safety features. Try adjusting your transcript content.' 
                : error.message;
            
            connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                await connection.execute(
                    `UPDATE note SET status = 'FAILED' WHERE id = ?`,
                    [noteId]
                );
                await connection.execute(
                    `UPDATE activity SET status = 'FAILED' WHERE type = 'Inclass Notes' AND respective_table_id = ? AND id = ?`,
                    [noteId, activityId]
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

// (buildUserPrompt function remains exactly the same as in your original code)
function buildUserPrompt(transcriptText, configJSON) {
    return `
    You are a university lecturer tasked with rewriting your full 3-hour lecture into a student-facing teaching document. This document will be read by a student who missed class entirely and needs to understand everything deeply — as if they were there.
    Your job is to convert the entire transcript into a comprehensive, structured, and easy-to-follow explanation, covering **all** details, logic, transitions, and background context.
    Rules:
    ${configJSON.detect_heading === true ? "Identify all section headings in the text." : ""}
    ${configJSON.highlight_key === true ? "Extract and list the most important key points." : ""}
    ${configJSON.identify_todo === true ? "Find and list all actionable to-do items." : ""}
    ${configJSON.detect_definitions === true ? "Identify and extract all formal definitions of terms or concepts." : ""}
    - DO NOT summarize, compress, or leave anything out. This is a **1:1 rewrite** of the full lecture — rewritten in clean explanatory paragraphs.
    - Write in **full sentences and paragraphs**, not bullet points.
    - Explain every term, concept, and process as if teaching it from scratch.
    - For each technical term, provide a brief definition and **why it matters**.
    - Include analogies where possible to make complex topics easier to understand.
    - Include section headers and subheaders for organization (e.g., Introduction, Access Time, Device Types).
    - Keep the structure similar to how the lecture unfolded — preserve flow and topic order.
    - If the lecturer repeats something, explain it again as repetition for emphasis.
    - Add clarification or expansion wherever the transcript lacks it — assume the reader has no prior knowledge.
    - **Do not skip side remarks, jokes, or comments that seem unrelated — include them clearly as they might help with memory, engagement, or exam hints.**
    - **Preserve any emotional cues, humor, sarcasm, or casual tone from the speaker if it affects how students interpret the message.**
    - **If a comment sounds like a clue, warning, or a joke that ties to exam content or memory hooks, keep it.**
    Tone:
    - Professional, but easy to follow.
    - Your voice is that of a helpful professor explaining clearly to a student.
    - Do not sound robotic or just like a transcript.
    ${configJSON.include_summary === true && configJSON.extract_key_in_summary === true ? ` At the end of the document, include a "**Study Tip Summary**" with a recap of: - Key exam topics - Common misunderstandings - Critical formulas or definitions to memorize` : ''}
    ${configJSON.include_summary === true ? ` At the end of the document, include a "**Study Tip Summary**"` : ''}
    ${configJSON.extract_key_in_summary === true ? ` At the end of the document, include a "**Study Tip Summary**" with a recap of: - Key exam topics` : ''}
    Now rewrite the following lecture transcript into a complete, self-contained, deeply explained document:
    Transcript:
    ${transcriptText}
    `;
}