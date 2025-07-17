import { r2 } from "@/lib/r2"; // Import R2 client
import { GetObjectCommand } from "@aws-sdk/client-s3"; // Import S3 command
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { queryWithRetry } from "@/lib/queryWithQuery";

export async function GET(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;
    const { searchParams } = new URL(req.url);

    const textbook_id = searchParams.get('textbook_id');

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const [rows] = await queryWithRetry('SELECT * from textbook where user_id = ? AND id = ?', [user_id, textbook_id]);
        const textbook = rows[0];
        
        if (!textbook) {
            return new Response(JSON.stringify({ error: 'Textbook Not Found' }), { status: 400 });        
        }

        // Helper function to read files from R2
        const readR2File = async (filePath, isBinary = false) => {
            try {
                const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
                const { Body } = await r2.send(new GetObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: cleanPath
                }));
                
                if (isBinary) {
                    const buffer = await Body.transformToByteArray();
                    return Buffer.from(buffer).toString('base64');
                }
                return await Body.transformToString();
            } catch (error) {
                console.error(`Error reading file from R2: ${filePath}`, error);
                return null;
            }
        };

        const [textbookTXTContent, originalFileContent, explanationFileContent] = await Promise.all([
            readR2File(textbook.textbookTXTFilePath), // Text file
            readR2File(textbook.originalFilePath, true), // Binary file (base64)
            readR2File(textbook.explanationFilePath, true) // Binary file (base64)
        ]);

        // Check if all files were found
        if (!textbookTXTContent || !originalFileContent || !explanationFileContent) {
            return new Response(JSON.stringify({ error: 'Failed to load textbook files' }), { status: 404 });
        }

        const responseData = {
            ...textbook,
            originalFile: {
                content: originalFileContent,
                path: textbook.originalFilePath
            },
            textbookTXTFile: {
                content: textbookTXTContent,
                path: textbook.textbookTXTFilePath
            },
            explanationFile: {
                content: explanationFileContent,
                path: textbook.explanationFilePath
            }
        };

        return new Response(JSON.stringify({ textbook: responseData }), { status: 200 });

    } catch (error) {
        console.error('Error fetching textbook:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}