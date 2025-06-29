import { db } from "@/lib/db";
import jwt from 'jsonwebtoken';

export default async function GET(req){
    const cookies = req.headers.get('cookie');
        const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;
    
        if (!token) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
    
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user_id = decoded.id;
        }catch(error){
            console.log(error);
                    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
        }
}