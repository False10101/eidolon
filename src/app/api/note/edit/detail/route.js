import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from 'jsonwebtoken';

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;
        
        const { fileName, lectureTopic, Instructor, noteId } = await req.json();

        if (!noteId) {
            return NextResponse.json({ message: 'Note ID is required.' }, { status: 400 });
        }

        const setClauses = [];
        const queryParams = [];

       
        if (fileName !== undefined) {
            setClauses.push('name = ?');
            queryParams.push(fileName);
        }

        if (lectureTopic !== undefined) {
            setClauses.push('lecture_topic = ?');
            queryParams.push(lectureTopic);
        }

        if (Instructor !== undefined) {
            setClauses.push('instructor = ?');
            queryParams.push(Instructor);
        }

        if (setClauses.length === 0) {
            return NextResponse.json({ message: 'No fields provided to update.' }, { status: 400 });
        }

        const sqlQuery = `UPDATE note SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`;
        
        queryParams.push(noteId, user_id);

        const [result] = await db.query(sqlQuery, queryParams);

        if (result.affectedRows === 0) {
            return NextResponse.json({ message: 'Note not found or you do not have permission to update it.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Note details updated successfully.' }, { status: 200 });

    } catch (error) {
        console.error("Update Error:", error);
        if (error.name === 'JsonWebTokenError') {
             return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}