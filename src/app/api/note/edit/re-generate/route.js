import { r2 } from "@/lib/r2";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import jwt from 'jsonwebtoken';
import { NextResponse } from "next/server";
import { updateNoteInBackground } from "@/lib/note-updater";
import { queryWithRetry } from "@/lib/queryWithQuery";
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { checkAPI } from "@/lib/apiChecker";

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    let connection;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const hasAPIKey = await checkAPI(user_id, "gemini");
        if (!hasAPIKey) {
            return new Response(JSON.stringify({ error: 'API Key needed to generate document.' }), { status: 400 });
        }


        const formData = await req.formData();
        const file = formData.get('file');
        const noteId = formData.get('id');
        const name = formData.get('fileName');
        const originalName = file.name;

        if (!file) {
            return new Response(JSON.stringify({ error: 'No File Provided' }), { status: 400 });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get existing note with FOR UPDATE to lock the row
        const [rows] = await connection.execute('SELECT * FROM note WHERE id = ? FOR UPDATE', [noteId]);

        if (rows.length === 0) {
            return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
        }
        const note = rows[0];

        // Store old path for cleanup
        const oldTranscriptPath = note.transcriptFilePath?.startsWith('/')
            ? note.transcriptFilePath.substring(1)
            : note.transcriptFilePath;

        // Generate new file path
        const fileBaseName = originalName.replace(/\.[^/.]+$/, ""); // Remove extension if present
        const uniqueTranscriptFileName = `${uuidv4()}_${fileBaseName}_transcript.txt`;
        const newTranscriptRelativePath = `note/${uniqueTranscriptFileName}`;
        const newTranscriptFullPath = `/${newTranscriptRelativePath}`;

        // Upload new file to R2
        const buffer = Buffer.from(await file.arrayBuffer());
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: newTranscriptRelativePath,
            Body: buffer,
            ContentType: 'text/plain'
        }));

        // Parse other form data
        const config = formData.get('config');
        const configJSON = JSON.parse(config);
        const lecture_topic = formData.get('topic') || null;
        const instructor = formData.get('instructor') || null;
        const style = formData.get('style');

        // Build update query
        const setClauses = [
            'name = ?',
            'transcriptFilePath = ?',
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
            name,
            newTranscriptFullPath,
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

        // Update note with new path
        const updateQuery = `UPDATE note SET ${setClauses.join(', ')} WHERE id = ?`;
        queryParams.push(noteId);
        await connection.execute(updateQuery, queryParams);

        // Create activity log
        const [activityResult] = await connection.execute(
            `INSERT INTO activity (type, title, status, date, user_id, token_sent, token_received, rate_per_sent, rate_per_received, respective_table_id) 
             VALUES ('Inclass Notes', ?, 'PENDING', NOW(), ?, 0, 0, 0.00000125, 0.00001, ?)`,
            [name, user_id, noteId]
        );

        if (activityResult.affectedRows === 0) {
            throw new Error("Failed to insert activity log.");
        }

        const activityId = activityResult.insertId;

        await connection.commit();

        // Delete old file only after successful commit
        if (oldTranscriptPath) {
            try {
                await r2.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: oldTranscriptPath
                }));
            } catch (cleanupError) {
                console.error('Error deleting old transcript file:', cleanupError);
                // Non-critical error - we can continue
            }
        }

        // Start background processing
        updateNoteInBackground(noteId, activityId, user_id);

        return new Response(JSON.stringify({ noteId: noteId }), { status: 200 });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        if (error.message.includes('Note not found')) {
            return NextResponse.json({ message: error.message }, { status: 404 });
        }

        console.error('Error starting note generation:', error);
        return new Response(JSON.stringify({ error: 'Failed to start note regeneration process.' }), { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}