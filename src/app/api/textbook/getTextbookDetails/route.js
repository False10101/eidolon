import { db } from "@/lib/db";
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token=')).split('=')[1] : null;
    const { searchParams } = new URL(req.url);

    const textbook_id = searchParams.get('textbook_id');

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const [[textbook]] = await db.query('SELECT * from textbook where user_id = ? AND id = ?', [user_id, textbook_id]);

        if(!textbook){
            return new Response(JSON.stringify({error : 'Textbook Not Found'}, {status : 400}));
        }

        const [textbookTXTContent, originalFileBuffer, explanationFileBuffer] = await Promise.all([
            fs.readFile(path.join(process.cwd(), 'storage', textbook.textbookTXTFilePath), 'utf-8'),
            fs.readFile(path.join(process.cwd(), 'storage', textbook.originalFilePath)),
            fs.readFile(path.join(process.cwd(), 'storage', textbook.explanationFilePath))
        ]);

        const responseData = {
            ...textbook, // Includes original .name, .size, and .type if you saved them
            originalFile: {
                // Encode the PDF buffer to a Base64 string for transport
                content: originalFileBuffer.toString('base64'),
                path: textbook.originalFilePath
            },
            textbookTXTFile: {
                // This is already a string, no conversion needed
                content: textbookTXTContent,
                path: textbook.textbookTXTFilePath
            },
            explanationFile: {
                // Encode the PDF buffer to a Base64 string for transport
                content: explanationFileBuffer.toString('base64'),
                path: textbook.explanationFilePath
            }
        };

        return new Response(JSON.stringify({textbook : responseData}), {status : 200});


    } catch (error) {
        console.log(error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 401 });
    }
}