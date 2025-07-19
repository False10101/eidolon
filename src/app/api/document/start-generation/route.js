import jwt from 'jsonwebtoken';
import { queryWithRetry } from "@/lib/queryWithQuery";
import { processDocumentInBackground } from "@/lib/document-processor";

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const { user_prompt, format_type, name } = await req.json();

        if (!user_prompt || !format_type || !name) {
            return new Response(JSON.stringify({ error: 'Sufficient Data Not Provided! Please try again.' }), { status: 400 });
        }
        
        if( format_type !== 'research_paper' && 
            format_type !== 'business_proposal' && 
            format_type !== 'cover_letter' && 
            format_type !== 'formal_report' && 
            format_type !== 'general_essay') {
            return new Response(JSON.stringify({ error: 'Invalid Format Type!' }), { status: 400 });
        }

        const [dbResult] = await queryWithRetry(
            `INSERT INTO document (name, user_prompt, format_type, created_at, user_id, status) 
             VALUES (?, ?, ?, NOW(), ?, 'PENDING')`, 
            [name, user_prompt, format_type, user_id]
        );

        if (!dbResult || dbResult.affectedRows === 0) {
            return new Response(JSON.stringify({ error: 'Database Error' }), { status: 500 });
        }

        const documentId = dbResult.insertId;
        processDocumentInBackground(documentId);

        return new Response(JSON.stringify({documentId: documentId }), { status: 200 });


    } catch (error) {
        console.error('Error starting document generation:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}