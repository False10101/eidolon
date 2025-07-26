import jwt from 'jsonwebtoken';
import { queryWithRetry } from "@/lib/queryWithQuery";

export async function GET(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const [rows] = await queryWithRetry(`SELECT id, name, created_at FROM document WHERE user_id = ? ORDER BY created_at DESC`, [user_id]);

        if (!rows) {
            return new Response(JSON.stringify({ error: 'Database Error' }), { status: 400 });
        } else if (rows.length === 0) {
            return new Response(JSON.stringify({ response: 'No History Found!' }), { status: 200 });
        } else {
            return new Response(JSON.stringify({ response: rows }), { status: 200 });
        }

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}