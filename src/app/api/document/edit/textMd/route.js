import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
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
        const { textMd, documentId } = await req.json();

        if (!textMd || !documentId) {
            return new Response(JSON.stringify({ error: 'Not Sufficient Data Provided' }), { status: 400 });
        }

        const [[row]] = await queryWithRetry('SELECT generatedFilePath FROM document WHERE id = ? AND user_id = ?', [documentId, user_id]);

        if (!row) {
            return NextResponse.json({ message: 'Document not found or you do not have permission.' }, { status: 404 });
        }

        const r2FilePath = row.generatedFilePath.startsWith('/') 
            ? row.generatedFilePath.substring(1) 
            : row.generatedFilePath;

        // SECURITY CHECK: Prevent path traversal attacks
        if (r2FilePath.includes('..')) {
            return NextResponse.json({ message: 'Invalid file path.' }, { status: 400 });
        }

        // Upload directly to R2
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: r2FilePath,
            Body: textMd,
            ContentType: 'text/plain', // Specific MIME type for markdown
        }));

        return NextResponse.json({ message: 'Document updated successfully.' }, { status: 200 });

    } catch (error) {
        console.error("Update Document Error:", error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}