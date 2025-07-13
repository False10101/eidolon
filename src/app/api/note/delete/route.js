import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from 'jsonwebtoken';

export async function DELETE(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const { searchParams } = new URL(req.url);
        const noteId = searchParams.get('id');

        if (!noteId) {
            return NextResponse.json({ error: 'Note ID is required.' }, { status: 400 });
        }

        const [result] = await db.query(
            `DELETE FROM note WHERE user_id = ? AND id = ?`, 
            [user_id, noteId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Note not found or you do not have permission.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Delete successful' }, { status: 200 });

    } catch (error) {
        console.error("Delete Note Error:", error);
        if (error.name === 'JsonWebTokenError') {
             return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}