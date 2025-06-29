import { db } from "@/lib/db";
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { writeFile } from 'fs/promises';
import path from "path";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token=')).split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {

        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const formData = await req.formData();
        const file = formData.get('file');
        const config = formData.get('config');
        const configJSON = JSON.parse(config);
        const lecture_topic = formData.get('topic') || null;
        const instructor = formData.get('instructor') || null;
        const fileName = formData.get('fileName');

        const style = formData.get('style');

        const temperatureParam = style === 'minimal' ? 0.3 : style === "creative" ? 1 : 0.6;


        if (!file) {
            return new Response(JSON.stringify({ error: 'No File Provided' }), { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const transcriptText = buffer.toString('utf-8');

        const userPrompt = `
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

${configJSON.include_summary === true && configJSON.extract_key_in_summary === true ? ` At the end of the document, include a “**Study Tip Summary**” with a recap of:
- Key exam topics
- Common misunderstandings
- Critical formulas or definitions to memorize` : ''}

${configJSON.include_summary === true ? ` At the end of the document, include a “**Study Tip Summary**”` : ''}

${configJSON.extract_key_in_summary === true ? ` At the end of the document, include a “**Study Tip Summary**” with a recap of:
- Key exam topics` : ''}

Now rewrite the following lecture transcript into a complete, self-contained, deeply explained document:

Transcript:
${transcriptText}
    `

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
                maxOutputTokens: 1000000,
                temperature: temperatureParam,
                topP: 0.95
            }
        });
        const generatedText = result.text;

        const usageMetadata = result.usageMetadata;

        if (usageMetadata) {
            const inputTokens = usageMetadata.promptTokenCount;
            const outputTokens = usageMetadata.candidatesTokenCount;
            const totalTokens = usageMetadata.totalTokenCount;

            console.log(`Input Tokens: ${inputTokens}`);
            console.log(`Output Tokens: ${outputTokens}`);
            console.log(`Total Tokens: ${totalTokens}`);
        }

        const originalName = fileName || file.name;
        const fileBaseName = originalName.includes('.')
            ? originalName.substring(0, originalName.lastIndexOf('.'))
            : originalName;

        // For generated notes
        const uniqueNotesFileName = `${uuidv4()}_${fileBaseName}_notes.txt`;
        const notesRelativePath = `/note/${uniqueNotesFileName}`;  // Relative path
        const notesFilePath = path.join(process.cwd(), 'public', notesRelativePath);
        await writeFile(notesFilePath, generatedText, 'utf-8');

        // For transcript text
        const uniqueTranscriptFileName = `${uuidv4()}_${fileBaseName}_transcript.txt`;
        const transcriptRelativePath = `/note/${uniqueTranscriptFileName}`;  // Relative path
        const transcriptFilePath = path.join(process.cwd(), 'public', transcriptRelativePath);
        await writeFile(transcriptFilePath, transcriptText, 'utf-8');


        const [dbResult] = await db.query('INSERT INTO note (name, lecture_topic, instructor, detect_heading, highlight_key, identify_todo, detect_definitions, include_summary, extract_key_in_summary, template_type, created_at, noteFilePath, user_id, transcriptFilePath) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [fileBaseName, lecture_topic, instructor, configJSON.detect_heading, configJSON.highlight_key, configJSON.identify_todo, configJSON.detect_definitions, configJSON.include_summary, configJSON.extract_key_in_summary, style, new Date().toISOString().slice(0, 19).replace('T', ' '), notesRelativePath, user_id, transcriptRelativePath]);

        return new Response(JSON.stringify({ noteId: dbResult.insertId }), { status: 200 });
    } catch (error) {
        console.error('Token verification failed:', error);

        if (error.message.includes('SAFETY')) {
            return new Response(JSON.stringify({ error: 'Content blocked by safety features. Try adjusting your transcipt content.' }), {
                status: 400
            })
        }

        return new Response(JSON.stringify({
            error: error.message || "Note generation failed"
        }), {
            status: 500
        })
    }
}