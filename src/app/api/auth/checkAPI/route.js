import jwt from 'jsonwebtoken';
import { queryWithRetry } from '@/lib/queryWithQuery';

export async function GET(req) {  // Changed from GET(params) to GET(req)
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        if (type !== 'gemini' && type !== 'murf' && type !== 'dall_e') {
            return new Response(JSON.stringify({ error: 'Invalid Type' }), { status: 400 });
        }

        const [dbResult] = await queryWithRetry(
            `SELECT ${type}_api FROM user WHERE id = ?`, 
            [user_id]
        );

        if (!dbResult || !dbResult[0] || !dbResult[0][`${type}_api`]) {
            return new Response(JSON.stringify({ apiPass: false }), { status: 404 });
        }

        return new Response(JSON.stringify({ apiPass: true }), { status: 200 });
    } catch (error) {
        console.error('Error checking API access:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}