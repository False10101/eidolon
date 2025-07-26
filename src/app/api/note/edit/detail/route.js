import jwt from 'jsonwebtoken';
import { queryWithRetry } from "@/lib/queryWithQuery";

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const formData = await req.formData();
        const noteId = formData.get('noteId');
        const Instructor = formData.get('Instructor');
        const lectureTopic = formData.get('lectureTopic');
        const fileName = formData.get('fileName');

        if (!fileName) {
            return new Response(JSON.stringify({ error: 'No File Name Provided' }), { status: 400 });
        }

        const setClauses = [ 'name = ?' ];
        const queryParams = [fileName];

        if (lectureTopic) {
            setClauses.push('lecture_topic = ?');
            queryParams.push(lectureTopic);
        }

        if (Instructor) {
            setClauses.push('instructor = ?');
            queryParams.push(Instructor);
        }

        const updateQuery = `UPDATE note SET ${setClauses.join(', ')} WHERE id = ?`;
        queryParams.push(noteId); 

        const [dbResult] = await queryWithRetry(updateQuery, queryParams);

        return new Response(JSON.stringify({ noteId: noteId }), { status: 200 });

    } catch (error) {
        console.error('Error saving details :', error);
        return new Response(JSON.stringify({ error: 'Failed to save details.' }), { status: 500 });
    }
}