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

        const [dbResult] = await queryWithRetry(`SELECT * from user where id = ?`, [user_id]);

        if (dbResult[0].type !== 'admin') {
            return new Response(JSON.stringify({ message: "You do not have permission to fetch this request." }, { status: 400 }));
        }

        const [result] = await queryWithRetry(`SELECT username, id from user ORDER BY username ASC`);

        return new Response(JSON.stringify({ userList: result }, { status: 200 }));


    } catch (error) {
        console.error('Error fetching data:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });

    }
}