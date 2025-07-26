import { r2 } from "@/lib/r2";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { queryWithRetry } from "@/lib/queryWithQuery";
import { db } from '@/lib/db';

export async function updateNoteInBackground(noteId, activityId, user_id) {
    let note;
    let connection;
    let oldNotePath = null;

    try {
        // Step 1: Fetch note data from database with FOR UPDATE to lock the row
        const [rows] = await queryWithRetry('SELECT * FROM note WHERE id = ? FOR UPDATE', [noteId]);
        note = rows[0];

        const [secondrows] = await queryWithRetry('SELECT gemini_api from user WHERE id = ? ', [user_id]);

        const gemini_api_key = secondrows[0]?.gemini_api;

        if (!note) {
            throw new Error(`Note with ID ${noteId} not found for processing.`);
        }

        // Store old paths for cleanup
        oldNotePath = note.noteFilePath?.startsWith('/') 
            ? note.noteFilePath.slice(1) 
            : note.noteFilePath;

        // --- TRANSACTION 1: SET 'PROCESSING' ---
        connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute(`UPDATE note SET status = 'PROCESSING' WHERE id = ?`, [noteId]);
            await connection.execute(
                `UPDATE activity SET title = ?, status = 'PROCESSING' 
                 WHERE type = 'Inclass Notes' AND user_id = ? AND respective_table_id = ? AND id = ?`, 
                [note.name, note.user_id, noteId, activityId]
            );
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

        // Step 3: Read transcript from R2
        const transcriptPath = note.transcriptFilePath.startsWith('/')
            ? note.transcriptFilePath.slice(1)
            : note.transcriptFilePath;

        const { Body: transcriptBody } = await r2.send(new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: transcriptPath
        }));
        const transcriptText = await transcriptBody.transformToString();

        // Step 4: Generate updated content with Gemini
        const genAI = new GoogleGenAI(gemini_api_key);

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

        // Step 5: Generate new note file path
        const uniqueNotesFileName = `${uuidv4()}_${cleanFilename(note.noteFilePath)}_notes.txt`;
        const newNotesRelativePath = `note/${uniqueNotesFileName}`;

        // Save updated note to new location
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: newNotesRelativePath,
            Body: generatedText,
            ContentType: 'text/plain'
        }));

        // --- TRANSACTION 2: UPDATE WITH NEW PATH ---
        connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute(
                `UPDATE note SET 
                    status = 'COMPLETED', 
                    noteFilePath = ?,
                    created_at = NOW() 
                 WHERE id = ?`,
                [`/${newNotesRelativePath}`, noteId]
            );
            
            await connection.execute(
                `UPDATE activity SET 
                    status = 'COMPLETED', 
                    token_sent = ?, 
                    token_received = ? 
                 WHERE type = 'Inclass Notes' AND respective_table_id = ? AND id = ?`,
                [usageMetadata.promptTokenCount, usageMetadata.candidatesTokenCount, noteId, activityId]
            );
            
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }

        // Clean up old note file after successful update
        if (oldNotePath) {
            try {
                await r2.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: oldNotePath
                }));
                console.log(`Deleted old note file: ${oldNotePath}`);
            } catch (cleanupError) {
                console.error('Error deleting old note file:', cleanupError);
                // Non-critical error - we can continue
            }
        }

        console.log(`Successfully updated note ID: ${noteId}`);

    } catch (error) {
        console.error(`Failed to update note ID ${noteId}:`, error);
        
        // Clean up any newly created files if the operation failed
        if (oldNotePath) {
            try {
                const newNotePath = `note/${uuidv4()}_${cleanFilename(note?.noteFilePath || 'note')}_notes.txt`;
                await r2.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: newNotePath
                }));
            } catch (cleanupError) {
                console.error('Error cleaning up new file after failure:', cleanupError);
            }
        }

        // Update status to FAILED
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
                    `UPDATE activity SET status = 'FAILED' 
                     WHERE type = 'Inclass Notes' AND respective_table_id = ? AND id = ?`,
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

function cleanFilename(filename) {
    // Remove UUID prefix (format: 8-4-4-4-12 hex digits separated by hyphens)
    let cleaned = filename.replace(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i, 
        ''
    );
    
    // Remove _notes.txt or _transcript.txt suffix
    cleaned = cleaned.replace(/_notes\.txt$|_transcript\.txt$/i, '');
    
    return cleaned;
}

// (buildUserPrompt function remains exactly the same)
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