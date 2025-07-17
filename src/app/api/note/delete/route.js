import { r2 } from "@/lib/r2"; // Import R2 client
import { DeleteObjectCommand } from "@aws-sdk/client-s3"; // Import S3 command
import { NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import { queryWithRetry } from "@/lib/queryWithQuery";

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
        const noteId = searchParams.get('id');

        if (!noteId) {
            return NextResponse.json({ error: 'Note ID is required.' }, { status: 400 });
        }

        // First get the file paths before deleting the record
        const [[note]] = await queryWithRetry(
            `SELECT noteFilePath, transcriptFilePath FROM note WHERE user_id = ? AND id = ?`, 
            [user_id, noteId]
        );

        if (!note) {
            return NextResponse.json({ error: 'Note not found or you do not have permission.' }, { status: 404 });
        }

        // Delete the database record
        const [result] = await queryWithRetry(
            `DELETE FROM note WHERE user_id = ? AND id = ?`, 
            [user_id, noteId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Failed to delete note.' }, { status: 500 });
        }

        const cleanR2Path = (path) => {
            if (!path) return null;
            return path.startsWith('/') ? path.slice(1) : path;
        };

        // Delete files from R2 (fire-and-forget)
        const deleteFiles = async () => {
            try {
                const filesToDelete = [
                    cleanR2Path(note.noteFilePath),
                    cleanR2Path(note.transcriptFilePath)
                ].filter(Boolean);

                await Promise.all(
                    filesToDelete.map(path => 
                        r2.send(new DeleteObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Key: path
                        }))
                    )
                );
            } catch (error) {
                console.error('R2 Deletion Error:', error);
                // Monitoring system alert would go here
            }
        };

        deleteFiles();
        return NextResponse.json({ message: 'Delete successful' }, { status: 200 });

    } catch (error) {
        console.error("Delete Note Error:", error);
        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}