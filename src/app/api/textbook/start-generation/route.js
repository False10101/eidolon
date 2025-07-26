import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { textbook_explanation_processor } from "@/lib/textbook-explanation-processor";
import { queryWithRetry } from "@/lib/queryWithQuery";
import { db } from '@/lib/db';

export async function POST(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    let connection;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const formData = await req.formData();
        const file = formData.get('file');
        const rawText = formData.get('extractedText');

        if (!file) {
            return new Response(JSON.stringify({ error: 'No File Provided' }), { status: 400 });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name;
        const fileExtension = originalName.split('.').pop();
        const fileBaseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

        // Generate unique filenames and R2 paths
        const uniqueTXTFileName = `${uuidv4()}_${fileBaseName}_textFile.txt`;
        const TXTRelativePath = `textbook/text/${uniqueTXTFileName}`;
        
        const uniqueOriginalFileName = `${uuidv4()}_${fileBaseName}.${fileExtension}`;
        const OriginalFileRelativePath = `textbook/original/${uniqueOriginalFileName}`;

        // Upload files to R2 in parallel
        await Promise.all([
            r2.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: TXTRelativePath,
                Body: rawText,
                ContentType: 'text/plain'
            })),
            
            r2.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: OriginalFileRelativePath,
                Body: fileBuffer,
                ContentType: file.type || 'application/octet-stream'
            }))
        ]);

        const formatOptions = formData.get('formatOptions');
        const formatOptionJSON = JSON.parse(formatOptions);

        const insertQuery = `
            INSERT INTO textbook 
            (name, simple_analogies, key_people, historical_timelines, 
             flashcards, practice_questions, cross_references, \`references\`, 
             instructions, textbookTXTFilePath, created_at, user_id, 
             status, originalFilePath) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

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
            `/${TXTRelativePath}`,
            new Date(),
            user_id,
            'PENDING',
            `/${OriginalFileRelativePath}`
        ];

        const [dbResult] = await connection.execute(insertQuery, values);
        const textbookId = dbResult.insertId;

        if (!textbookId) {
            throw new Error("Failed to insert textbook record.");
        }

        const [activityResult] = await connection.execute(
            `INSERT INTO activity (type, title, status, date, user_id, token_sent, token_received, rate_per_sent, rate_per_received, respective_table_id) 
             VALUES ('Textbook Explainer', ?, 'PENDING', NOW(), ?, 0, 0, 0.00000125, 0.00001, ?)`,
            [originalName, user_id, textbookId]
        );

        if (activityResult.affectedRows === 0) {
            throw new Error("Failed to insert activity log.");
        }

        const activityId = activityResult.insertId;

        await connection.commit();
        
        textbook_explanation_processor(textbookId, activityId);

        return new Response(JSON.stringify({ textbookId: textbookId }), { status: 200 });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error("Upload Error:", error);
        if (error.name === 'JsonWebTokenError') {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
        }
        return new Response(JSON.stringify({ 
            error: 'Internal Server Error',
            details: error.message 
        }), { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}