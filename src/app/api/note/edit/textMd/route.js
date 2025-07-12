import { NextResponse } from "next/server"
import { db } from "@/lib/db";
import jwt from 'jsonwebtoken';
import path from "path";
import { writeFile } from "fs/promises";


export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;
        const  { mdText, noteId} = await req.json();

        if (!mdText) {
            return NextResponse.json({ message: 'Markdown content is required.' }, { status: 400 });
        }

        const [[row]] = await db.query(`SELECT noteFilePath from note WHERE id = ? AND user_id`, [noteId, user_id]);

        if (!row) {
            return NextResponse.json({ message: 'Note not found or you do not have permission.' }, { status: 404 });
        }

        const fileName = row.noteFilePath.replace('/note/', '');

        // SECURITY CHECK: Prevent path traversal attacks
        if (fileName.includes('..') || fileName.includes('/')) {
            return NextResponse.json({ message: 'Invalid file path.' }, { status: 400 });
        }
        
        const absoluteFilePath = path.join(process.cwd(), 'storage', 'note', fileName);

        await writeFile(absoluteFilePath, mdText, 'utf-8');

        return NextResponse.json({ message: 'Note updated successfully.' }, { status: 200 });



    } catch (error) {
        console.error("Update Note Error:", error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}