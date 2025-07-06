import { db } from "@/lib/db";
import { writeFile } from "fs/promises";
import jwt from 'jsonwebtoken';
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { textbook_explanation_processor } from "@/lib/textbook-explanation-processor";

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const formData = await req.formData();
        const file = formData.get('file');
        const rawText = formData.get('extractedText');

        if (!file) {
            return new Response(JSON.stringify({ error: 'No File Provided' }), { status: 400 });
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name;

        // --- Start of Changes ---

        // 1. Get the base name of the file, stripping its original extension
        const fileBaseName = path.basename(originalName, path.extname(originalName));

        // 2. Create the unique filename for the extracted text file (as a .txt)
        const uniqueTXTFileName = `${uuidv4()}_${fileBaseName}_textFile.txt`;
        const TXTRelativePath = `/textbook/text/${uniqueTXTFileName}`;
        const textbookTXTFilePath = path.join(process.cwd(), 'storage', TXTRelativePath);

        // 3. Create the unique filename for the original file, forcing a .pdf extension
        const uniqueOriginalFileName = `${uuidv4()}_${fileBaseName}.pdf`;
        const OriginalFileRelativePath = `/textbook/original/${uniqueOriginalFileName}`;
        const originalFilePath = path.join(process.cwd(), 'storage', OriginalFileRelativePath);
        
        // --- End of Changes ---


        await writeFile(textbookTXTFilePath, rawText);

        await writeFile(originalFilePath, fileBuffer);

        const formatOptions = formData.get('formatOptions');
        const formatOptionJSON = JSON.parse(formatOptions);

        const insertQuery = `INSERT INTO textbook (name, simple_analogies, key_people, historical_timelines, flashcards, practice_questions, cross_references, \`references\`, instructions, textbookTXTFilePath, created_at, user_id, status, originalFilePath) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            originalName,
            formatOptionJSON.simple_analogies || false,
            formatOptionJSON.key_people || false,
            formatOptionJSON.historical_timelines || false,
            formatOptionJSON.flashcards || false,
            formatOptionJSON.practice_questions || false,
            formatOptionJSON.cross_references || false,
            formatOptionJSON.references || false,
            formatOptionJSON.instructions || false,
            TXTRelativePath, 
            new Date(),
            user_id,
            'PENDING',
            OriginalFileRelativePath
        ];

        const [dbResult] = await db.query(insertQuery, values);

        const textbookId = dbResult.insertId;

        textbook_explanation_processor(textbookId);

        return new Response(JSON.stringify({ textbookId :  textbookId}), { status: 200 });


    } catch (error) {
        console.error("Upload Error:", error);
        // Handle JWT errors or other server errors
        if (error.name === 'JsonWebTokenError') {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
        }
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}