import { NextResponse } from "next/server";
import { r2 } from "@/lib/r2"; // Import R2 client
import { PutObjectCommand } from "@aws-sdk/client-s3"; // Import S3 command
import jwt from 'jsonwebtoken';
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
        const { mdText, noteId } = await req.json();

        if (!mdText) {
            return NextResponse.json({ message: 'Markdown content is required.' }, { status: 400 });
        }

        const [[row]] = await queryWithRetry(`SELECT noteFilePath from note WHERE id = ? AND user_id = ?`, [noteId, user_id]);

        if (!row) {
            return NextResponse.json({ message: 'Note not found or you do not have permission.' }, { status: 404 });
        }

        // Use the exact path from database (no path.join needed)
        const r2FilePath = row.noteFilePath.startsWith('/') 
            ? row.noteFilePath.substring(1) 
            : row.noteFilePath;

        // SECURITY CHECK: Prevent path traversal attacks
        if (r2FilePath.includes('..')) {
            return NextResponse.json({ message: 'Invalid file path.' }, { status: 400 });
        }

        // Upload directly to R2
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: r2FilePath,
            Body: mdText,
            ContentType: 'text/markdown', // Specific MIME type for markdown
        }));

        return NextResponse.json({ message: 'Note updated successfully.' }, { status: 200 });

    } catch (error) {
        console.error("Update Note Error:", error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}