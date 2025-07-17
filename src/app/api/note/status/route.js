import jwt from 'jsonwebtoken';
import { queryWithRetry } from "@/lib/queryWithQuery";

/**
 * This API route checks the status of a note generation job.
 * It's a fast, read-only operation.
 * It ensures a user can only check the status of their own jobs.
 */
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
        const noteId = searchParams.get('id');

        if (!noteId) {
            return new Response(JSON.stringify({ error: 'Note ID is required.' }), { status: 400 });
        }

        const [note] = await queryWithRetry(`SELECT status, noteFilePath FROM note WHERE id = ? AND user_id = ?`,
            [noteId, user_id]
        );

        if (!note) {
            return new Response(JSON.stringify({ error: 'Note not found or access denied.' }), { status: 404 });
        }

        return new Response(JSON.stringify(note[0]), { status: 200 });

    } catch (error) {
        console.error('Error checking note status:', error);
        // Handle potential expired token errors
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
             return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token.' }), { status: 401 });
        }
        return new Response(JSON.stringify({ error: 'Failed to check note status.' }), { status: 500 });
    }
}