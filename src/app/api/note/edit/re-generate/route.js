import { r2 } from "@/lib/r2"; // Import R2 client
import { PutObjectCommand } from "@aws-sdk/client-s3"; // Import S3 command
import jwt from 'jsonwebtoken';
import { NextResponse } from "next/server";
import { updateNoteInBackground } from "@/lib/note-updater";
import { queryWithRetry } from "@/lib/queryWithQuery";

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const formData = await req.formData();
        const file = formData.get('file');
        const noteId = formData.get('id');
        const fileName = formData.get('filename');

        if (!file) {
            return new Response(JSON.stringify({ error: 'No File Provided' }), { status: 400 });
        }

        const [rows] = await queryWithRetry('SELECT * FROM note WHERE id = ?', [noteId]);

        if (rows.length === 0) { 
            return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
        }
        const note = rows[0];

        if (!note) {
            return NextResponse.json({ message: 'Note not found or you do not have permission.' }, { status: 404 });
        }

        // Upload new file to R2 (using existing path from database)
        const buffer = Buffer.from(await file.arrayBuffer());
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: note.transcriptFilePath.startsWith('/') 
                ? note.transcriptFilePath.substring(1) 
                : note.transcriptFilePath,
            Body: buffer,
            ContentType: 'text/plain' // Adjust based on your file type
        }));

        const config = formData.get('config');
        const configJSON = JSON.parse(config);
        const lecture_topic = formData.get('topic') || null;
        const instructor = formData.get('instructor') || null;
        const style = formData.get('style');

        const setClauses = [
            'name = ?',
            'detect_heading = ?',
            'highlight_key = ?',
            'identify_todo = ?',
            'detect_definitions = ?',
            'include_summary = ?',
            'extract_key_in_summary = ?',
            'template_type = ?',
            'created_at = ?',
            'status = ?'
        ];

        const queryParams = [
            fileName,
            configJSON.detect_heading,
            configJSON.highlight_key,
            configJSON.identify_todo,
            configJSON.detect_definitions,
            configJSON.include_summary,
            configJSON.extract_key_in_summary,
            style,
            new Date().toISOString().slice(0, 19).replace('T', ' '),
            'PENDING' 
        ];

        if (lecture_topic) {
            setClauses.push('lecture_topic = ?');
            queryParams.push(lecture_topic);
        }

        if (instructor) {
            setClauses.push('instructor = ?');
            queryParams.push(instructor);
        }

        const updateQuery = `UPDATE note SET ${setClauses.join(', ')} WHERE id = ?`;
        queryParams.push(noteId); 

        const [dbResult] = await queryWithRetry(updateQuery, queryParams);
        updateNoteInBackground(noteId);

        return new Response(JSON.stringify({ noteId: noteId }), { status: 200 });

    } catch (error) {
        console.error('Error starting note generation:', error);
        return new Response(JSON.stringify({ error: 'Failed to start note regeneration process.' }), { status: 500 });
    }
}