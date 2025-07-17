import { r2 } from "@/lib/r2"; // Import R2 client
import { PutObjectCommand } from "@aws-sdk/client-s3"; // Import S3 command
import { updateTextbookInBackground } from "@/lib/textbook-updater";
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
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
        const file = formData.get('file');
        const textbookId = formData.get('id');
        const rawText = formData.get('extractedText');

        if (!file) {
            return new Response(JSON.stringify({ error: 'No File Provided' }), { status: 400 });
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name;

        const [row] = await queryWithRetry('SELECT * FROM textbook where id = ?', [textbookId]);

        if (row.length === 0) {
            return NextResponse.json({ message: 'Textbook not found.' }, { status: 404 });
        }
        const textbook = row[0];

        if (!textbook) {
            return NextResponse.json({ message: 'Textbook not found or you do not have permission.' }, { status: 404 });
        }

        // Upload files to R2 (using existing paths from database)
        await Promise.all([
            // Original file (PDF/other binary)
            r2.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: textbook.originalFilePath.startsWith('/') 
                    ? textbook.originalFilePath.slice(1) 
                    : textbook.originalFilePath,
                Body: fileBuffer,
                ContentType: file.type || 'application/octet-stream'
            })),
            
            // Text transcript
            r2.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: textbook.textbookTXTFilePath.startsWith('/') 
                    ? textbook.textbookTXTFilePath.slice(1) 
                    : textbook.textbookTXTFilePath,
                Body: rawText,
                ContentType: 'text/plain'
            }))
        ]);

        const formatOptions = formData.get('formatOptions');
        const formatOptionJSON = JSON.parse(formatOptions);

        const updateQuery = `UPDATE textbook SET 
            name = ?, 
            simple_analogies = ?, 
            key_people = ?, 
            historical_timelines = ?, 
            flashcards = ?, 
            practice_questions = ?, 
            cross_references = ?, 
            \`references\` = ?, 
            instructions = ?, 
            created_at = ?, 
            status = ? 
            WHERE id = ?`;

        const queryParams = [
            originalName,
            formatOptionJSON.simple_analogies || false,
            formatOptionJSON.key_people || false,
            formatOptionJSON.historical_timelines || false,
            formatOptionJSON.flashcards || false,
            formatOptionJSON.practice_questions || false,
            formatOptionJSON.cross_references || false,
            formatOptionJSON.references || false,
            formatOptionJSON.instructions || false,
            new Date(),
            'PENDING',
            textbookId
        ];

        const [dbResult] = await queryWithRetry(updateQuery, queryParams);
        updateTextbookInBackground(textbookId);

        return new Response(JSON.stringify({ textbookId: textbookId }), { status: 200 });

    } catch (error) {
        console.error('Error starting textbook generation:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to start textbook regeneration process.',
            details: error.message 
        }), { status: 500 });
    }
}