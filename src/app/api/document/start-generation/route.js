import jwt from 'jsonwebtoken';
import { db } from '@/lib/db'; 
import { processDocumentInBackground } from "@/lib/document-processor";

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

        const { user_prompt, format_type, name } = await req.json();

        if (!user_prompt || !format_type || !name) {
            return new Response(JSON.stringify({ error: 'Sufficient Data Not Provided!' }), { status: 400 });
        }
        if (['research_paper', 'business_proposal', 'cover_letter', 'formal_report', 'general_essay'].indexOf(format_type) === -1) {
            return new Response(JSON.stringify({ error: 'Invalid Format Type!' }), { status: 400 });
        }

        connection = await db.getConnection(); 
        await connection.beginTransaction();

        const [docResult] = await connection.execute(
            `INSERT INTO document (name, user_prompt, format_type, created_at, user_id, status) 
             VALUES (?, ?, ?, NOW(), ?, 'PENDING')`,
            [name, user_prompt, format_type, user_id]
        );

        const documentId = docResult.insertId;
        if (!documentId) {
            throw new Error("Failed to insert document.");
        }

        const [activityResult] = await connection.execute(
            `INSERT INTO activity (type, title, status, date, user_id, token_sent, token_received, rate_per_sent, rate_per_received, respective_table_id) 
             VALUES ('Document', ?, 'PENDING', NOW(), ?, 0, 0, 0.00000125, 0.00001, ?)`,
            [name, user_id, documentId]
        );

        if (activityResult.affectedRows === 0) {
            throw new Error("Failed to insert activity log.");
        }

        const activityId = activityResult.insertId;
        
        await connection.commit();
        
        processDocumentInBackground(documentId, activityId);

        return new Response(JSON.stringify({ documentId: documentId }), { status: 200 });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error during document creation transaction:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}