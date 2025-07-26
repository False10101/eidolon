import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { r2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { queryWithRetry } from "@/lib/queryWithQuery";

export async function GET(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token=')).split('=')[1] : null;
    const { searchParams } = new URL(req.url);

    const note_id = searchParams.get('note_id')

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const [[note]] = await queryWithRetry("SELECT * from note where user_id = ? AND id = ?", [user_id, note_id]);

        if (!note) {
            return new Response(JSON.stringify({ error: 'Note Not Found' }), { status: 400 });

        }

        const readR2File = async (filePath) => {
            if (!filePath) {
                return null;
            }

            try {
                const { Body } = await r2.send(new GetObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: filePath.startsWith('/') ? filePath.substring(1) : filePath // Remove leading slash if present
                }));
                return await Body.transformToString();
            } catch (error) {
                console.error(`Error reading file from R2: ${filePath}`, error);
                return null;
            }
        };

        const [noteFileContent, transcriptFileContent] = await Promise.all([
            readR2File(note.noteFilePath),
            readR2File(note.transcriptFilePath)
        ]);

        const responseData = {
            ...note,  // Spread all note properties
            files: {
                noteFile: {
                    content: noteFileContent,
                    path: note.noteFilePath
                },
                transcriptFile: {
                    content: transcriptFileContent,
                    path: note.transcriptFilePath,
                    name : note.transcriptFilePath.startsWith('/')
                        ? cleanFilename(note.transcriptFilePath.slice(6)) 
                        : cleanFilename(note.transcriptFilePath) 
                }
            }
        };

        return new Response(JSON.stringify({ note: responseData }), { status: 200 });

    } catch (error) {
        console.log(error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 401 });
    }
}

function cleanFilename(filename) {
  // Remove UUID prefix
  let cleaned = filename.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i, 
    ''
  );
  
  // Remove any suffix that starts with underscore and ends with .txt
  cleaned = cleaned.replace(/_[^_]+\.txt$/i, '');
  
  return cleaned;
}