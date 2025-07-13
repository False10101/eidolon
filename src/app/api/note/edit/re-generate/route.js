import { db } from "@/lib/db";
import jwt from 'jsonwebtoken';
import { writeFile } from 'fs/promises';
import { NextResponse } from "next/server";
import path from "path";
import { updateNoteInBackground } from "@/lib/note-updater";

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
        const noteId = formData.get('id');
        const fileName = formData.get('filename');

        if (!file) {
            return new Response(JSON.stringify({ error: 'No File Provided' }), { status: 400 });
        }

        const [rows] = await db.query('SELECT * FROM note WHERE id = ?', [noteId]);

        if (rows.length === 0) { 
            return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
        }
        const note = rows[0];

        if (!note) {
            return NextResponse.json({ message: 'Note not found or you do not have permission.' }, { status: 404 });
        }

        const absoluteTranscriptPath = path.join(process.cwd(), 'storage', note.transcriptFilePath);

        const buffer = Buffer.from(await file.arrayBuffer());

        await writeFile(absoluteTranscriptPath, buffer);

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
            'user_id = ?',
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
            user_id,
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

        const [dbResult] = await db.query(updateQuery, queryParams);
        updateNoteInBackground(noteId);

        return new Response(JSON.stringify({ noteId: noteId }), { status: 200 });


    } catch (error) {
        console.error('Error starting note generation:', error);
        return new Response(JSON.stringify({ error: 'Failed to start note regeneration process.' }), { status: 500 });
    }
}