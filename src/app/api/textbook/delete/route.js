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
        const textbookId = searchParams.get('id');

        if (!textbookId) {
            return NextResponse.json({ error: 'Textbook ID is required.' }, { status: 400 });
        }

        const [result] = await db.query(
            `DELETE FROM textbook WHERE user_id = ? AND id = ?`, 
            [user_id, textbookId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Textbook not found or you do not have permission.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Delete successful' }, { status: 200 });

    } catch (error) {
        console.error("Delete textbook Error:", error);
        if (error.name === 'JsonWebTokenError') {
             return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}