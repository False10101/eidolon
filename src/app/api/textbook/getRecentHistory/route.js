import { queryWithRetry } from '@/lib/queryWithQuery';
import jwt from 'jsonwebtoken';

export async function GET(req){
    const cookies = req.headers.get('cookie');
        const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;
    
        if (!token) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
    
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user_id = decoded.id;

            const [row] = await queryWithRetry(`Select id, name, created_at from textbook WHERE user_id = ? `, [user_id]);

            if(!row){
                return new Response(JSON.stringify({error : 'Database Error'}), {status : 400});
            } else if(row.length === 0){
                return new Response(JSON.stringify({response : 'No History Found!'}), {status : 200})
            } else {
                return new Response(JSON.stringify({response : row}), {status : 200})
            }


        }catch(error){
            console.log(error);
                    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
        }
}

