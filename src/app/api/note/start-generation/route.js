import { r2 } from "@/lib/r2"; // Import R2 client
import { PutObjectCommand } from "@aws-sdk/client-s3"; // Import S3 command
import { processNoteInBackground } from "@/lib/note-processor";
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { queryWithRetry } from "@/lib/queryWithQuery";

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({ error: 'No File Provided' }), { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const originalName = formData.get('fileName') || file.name;
        const fileBaseName = originalName.includes('.') 
            ? originalName.substring(0, originalName.lastIndexOf('.')) 
            : originalName;
        
        // Generate unique filename and R2 path
        const uniqueTranscriptFileName = `${uuidv4()}_${fileBaseName}_transcript.txt`;
        const transcriptRelativePath = `note/${uniqueTranscriptFileName}`; // Removed leading slash

        // Upload to R2 instead of local storage
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: transcriptRelativePath,
            Body: buffer,
            ContentType: 'text/plain', // Set appropriate content type
        }));

        const config = formData.get('config');
        const configJSON = JSON.parse(config);
        const lecture_topic = formData.get('topic') || null;
        const instructor = formData.get('instructor') || null;
        const style = formData.get('style');

        const insertQuery = `
            INSERT INTO note 
            (name, lecture_topic, instructor, detect_heading, highlight_key, identify_todo, 
             detect_definitions, include_summary, extract_key_in_summary, template_type, 
             created_at, user_id, transcriptFilePath, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `;

        const [dbResult] = await queryWithRetry(insertQuery, [
            fileBaseName,
            lecture_topic,
            instructor,
            configJSON.detect_heading,
            configJSON.highlight_key,
            configJSON.identify_todo,
            configJSON.detect_definitions,
            configJSON.include_summary,
            configJSON.extract_key_in_summary,
            style,
            new Date().toISOString().slice(0, 19).replace('T', ' '),
            user_id,
            `/${transcriptRelativePath}` // Add leading slash for DB consistency
        ]);
        
        const noteId = dbResult.insertId;
        processNoteInBackground(noteId);

        return new Response(JSON.stringify({ noteId: noteId }), { status: 200 });

    } catch (error) {
        console.error('Error starting note generation:', error);
        return new Response(JSON.stringify({ error: 'Failed to start note generation process.' }), { status: 500 });
    }
}