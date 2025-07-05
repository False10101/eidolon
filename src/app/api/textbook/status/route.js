import { db } from "@/lib/db";
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
        const textbookId = searchParams.get('id');

        if (!textbookId) {
            return new Response(JSON.stringify({ error: 'Textbook ID is required. ' }), { status: 400 });
        }

        const [textbook] = await db.query(`SELECT status, explanationFilePath FROM textbook WHERE id = ? AND user_id = ?`, [textbookId, user_id]);

        if (!textbook) {
            return new Response(JSON.stringify({ error: 'Textbook not found or access denied.' }), { status: 404 });
        }

        return new Response(JSON.stringify(textbook[0]), { status: 200 });
    } catch (error) {
        console.error('Error checking textbook status:', error);
        // Handle potential expired token errors
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token.' }), { status: 401 });
        }
        return new Response(JSON.stringify({ error: 'Failed to check note status.' }), { status: 500 });
    }
}