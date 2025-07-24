import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Using your corrected import
import { updateDocumentInBackground } from '@/lib/document-updater';

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let connection;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;
        const { user_prompt, format_type, name, documentId } = await req.json();

        if (!documentId || !user_prompt || !format_type || !name) {
            return NextResponse.json({ message: 'All fields including Document ID are required.' }, { status: 400 });
        }
        if (['research_paper', 'business_proposal', 'cover_letter', 'formal_report', 'general_essay'].indexOf(format_type) === -1) {
            return NextResponse.json({ error: 'Invalid Format Type!' }, { status: 400 });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [docResult] = await connection.execute(
            `UPDATE document SET name = ?, user_prompt = ?, format_type = ?, created_at = NOW(), status = 'PENDING' WHERE id = ? AND user_id = ?`,
            [name, user_prompt, format_type, documentId, user_id]
        );
        
        if (docResult.affectedRows === 0) {
             throw new Error('Document not found or user does not have permission.');
        }

        const [activityResult] = await connection.execute(
            `INSERT INTO activity (type, title, status, date, user_id, token_sent, token_received, rate_per_sent, rate_per_received, respective_table_id) 
             VALUES ('Document', ?, 'PENDING', NOW(), ?, 0, 0, 0.00000125, 0.00001, ?)`,
            [name, user_id, documentId]
        );

        if (activityResult.affectedRows === 0) {
            throw new Error(`No corresponding activity log found for document ${documentId} to update.`);
        }

        const activityId = activityResult.insertId;

        await connection.commit();

        updateDocumentInBackground(documentId, activityResult.insertId);

        return NextResponse.json({ documentId: documentId }, { status: 200 });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        
        // Provide more specific feedback if it's our custom error
        if (error.message.includes('Document not found')) {
            return NextResponse.json({ message: error.message }, { status: 404 });
        }

        console.error("Re-generate Document Error:", error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}