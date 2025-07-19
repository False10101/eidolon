import { queryWithRetry } from "@/lib/queryWithQuery";
import jwt from 'jsonwebtoken';

export async function GET(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const { searchParams } = new URL(req.url);
        const documentId = searchParams.get('id');

        if (!documentId) {
            return new Response(JSON.stringify({ error: 'Document ID is required.' }), { status: 400 });
        }

        const [document] = await queryWithRetry(`SELECT status, generatedFilePath FROM document WHERE id = ? AND user_id = ?`,
            [documentId, user_id]
        );

        if (!document) {
            return new Response(JSON.stringify({ error: 'Document not found or access denied.' }), { status: 404 });
        }

        return new Response(JSON.stringify(document[0]), { status: 200 });

    } catch (error) {
        console.error('Error checking document status:', error);
        // Handle potential expired token errors
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token.' }), { status: 401 });
        }
        return new Response(JSON.stringify({ error: 'Failed to check document status.' }), { status: 500 });
    }
}
