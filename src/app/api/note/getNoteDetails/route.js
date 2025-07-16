import { db } from "@/lib/db";
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';


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

        const [[note]] = await db.query("SELECT * from note where user_id = ? AND id = ?", [user_id, note_id]);

         if (!note) {
      return new Response(JSON.stringify({error : 'Note Not Found'}), {status : 400});

    }

        const [noteFileContent, transcriptFileContent] = await Promise.all([
      fs.readFile(path.join(process.cwd(), 'storage', note.noteFilePath), 'utf-8'),
      fs.readFile(path.join(process.cwd(), 'storage', note.transcriptFilePath), 'utf-8')
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
          path: note.transcriptFilePath
        }
      }
    };

    return new Response(JSON.stringify({note : responseData}), {status : 200});

    } catch (error) {
        console.log(error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 401 });
    }
}