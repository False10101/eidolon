import { r2 } from "@/lib/r2"; // Import R2 client
import { PutObjectCommand } from "@aws-sdk/client-s3"; // Import S3 command
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { textbook_explanation_processor } from "@/lib/textbook-explanation-processor";
import { queryWithRetry } from "@/lib/queryWithQuery";

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
        const fileExtension = originalName.split('.').pop();
        const fileBaseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

        // Generate unique filenames and R2 paths
        const uniqueTXTFileName = `${uuidv4()}_${fileBaseName}_textFile.txt`;
        const TXTRelativePath = `textbook/text/${uniqueTXTFileName}`; // No leading slash
        
        const uniqueOriginalFileName = `${uuidv4()}_${fileBaseName}.${fileExtension}`;
        const OriginalFileRelativePath = `textbook/original/${uniqueOriginalFileName}`; // No leading slash

        // Upload files to R2 in parallel
        await Promise.all([
            // Upload text file
            r2.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: TXTRelativePath,
                Body: rawText,
                ContentType: 'text/plain'
            })),
            
            // Upload original file
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
            `/${TXTRelativePath}`, // Add leading slash for DB consistency
            new Date(),
            user_id,
            'PENDING',
            `/${OriginalFileRelativePath}` // Add leading slash for DB consistency
        ];

        const [dbResult] = await queryWithRetry(insertQuery, values);
        const textbookId = dbResult.insertId;

        // Start background processing
        textbook_explanation_processor(textbookId);

        return new Response(JSON.stringify({ textbookId: textbookId }), { status: 200 });

    } catch (error) {
        console.error("Upload Error:", error);
        if (error.name === 'JsonWebTokenError') {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
        }
        return new Response(JSON.stringify({ 
            error: 'Internal Server Error',
            details: error.message 
        }), { status: 500 });
    }
}