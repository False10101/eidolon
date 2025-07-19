import {r2 } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { queryWithRetry } from '@/lib/queryWithQuery';  
import { updateDocumentInBackground } from '@/lib/document-updater';

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;
        const { user_prompt, format_type, name, documentId } = await req.json();

        if (!documentId || !user_prompt || !format_type || !name) {
            return NextResponse.json({ message: 'Document ID is required.' }, { status: 400 });
        }

        if( format_type !== 'research_paper' && 
            format_type !== 'business_proposal' && 
            format_type !== 'cover_letter' && 
            format_type !== 'formal_report' && 
            format_type !== 'general_essay') {
            return new Response(JSON.stringify({ error: 'Invalid Format Type!' }), { status: 400 });
        }

        const [dbResult] = await queryWithRetry(
            `UPDATE document SET name = ?, user_prompt = ?, format_type = ?, created_at = NOW(), status = 'PENDING' WHERE id = ? AND user_id = ?`, 
            [name, user_prompt, format_type, documentId, user_id]
        );

        if (!dbResult || dbResult.affectedRows === 0) {
            return NextResponse.json({ message: 'Document not found or you do not have permission.' }, { status: 404 });
        }

        updateDocumentInBackground(documentId);

        return NextResponse.json({ message: 'Document re-generated successfully.' }, { status: 200 });

    } catch (error) {
        console.error("Re-generate Document Error:", error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}