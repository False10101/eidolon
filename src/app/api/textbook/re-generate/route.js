import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { updateTextbookInBackground } from "@/lib/textbook-updater";
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAPI } from "@/lib/apiChecker";

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let connection;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const hasAPIKey = await checkAPI(user_id, "gemini");
        if (!hasAPIKey) {
            return new Response(JSON.stringify({ error: 'API Key needed to generate document.' }), { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        const textbookId = formData.get('id');
        const rawText = formData.get('extractedText');

        if (!file || !textbookId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Verify textbook exists and belongs to user
        const [row] = await connection.execute('SELECT * FROM textbook WHERE id = ? AND user_id = ?', [textbookId, user_id]);
        if (row.length === 0) {
            throw new Error('Textbook not found or user does not have permission.');
        }
        const textbook = row[0];

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name;

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

        // Update textbook record
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
            created_at = NOW(), 
            status = 'PENDING'
            WHERE id = ?`;

        const [dbResult] = await connection.execute(updateQuery, [
            originalName,
            formatOptionJSON.simple_analogies || false,
            formatOptionJSON.key_people || false,
            formatOptionJSON.historical_timelines || false,
            formatOptionJSON.flashcards || false,
            formatOptionJSON.practice_questions || false,
            formatOptionJSON.cross_references || false,
            formatOptionJSON.references || false,
            formatOptionJSON.instructions || false,
            textbookId
        ]);

        if (dbResult.affectedRows === 0) {
            throw new Error('Failed to update textbook record.');
        }

        // Create new activity record
        const [activityResult] = await connection.execute(
            `INSERT INTO activity (type, title, status, date, user_id, token_sent, token_received, rate_per_sent, rate_per_received, respective_table_id) 
             VALUES ('Textbook Explainer', ?, 'PENDING', NOW(), ?, 0, 0, 0.00000125, 0.00001, ?)`,
            [originalName, user_id, textbookId]
        );

        if (activityResult.affectedRows === 0) {
            throw new Error('Failed to create activity record.');
        }

        const activityId = activityResult.insertId;

        await connection.commit();

        // Start background processing with both IDs
        updateTextbookInBackground(textbookId, activityId, user_id);

        return NextResponse.json({ textbookId: textbookId }, { status: 200 });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error during textbook regeneration:', error);

        if (error.message.includes('Textbook not found')) {
            return NextResponse.json({ message: error.message }, { status: 404 });
        }

        return NextResponse.json({
            error: 'Failed to regenerate textbook',
            details: error.message
        }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}