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

        const [result] = await queryWithRetry(`SELECT  a.id,  a.title,  a.type,  a.date, u.username  FROM  activity a JOIN  user u ON a.user_id = u.id ORDER BY a.date DESC`);

        return new Response(JSON.stringify({ activityList: result }, { status: 200 }));


    } catch (error) {
        console.error('Error fetching data:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });

    }
}