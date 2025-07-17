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
        const textbookId = searchParams.get('id');

        if (!textbookId) {
            return NextResponse.json({ error: 'Textbook ID is required.' }, { status: 400 });
        }

        // First get the file paths before deleting the record
        const [[textbook]] = await queryWithRetry(
            `SELECT textbookTXTFilePath, explanationFilePath, originalFilePath 
             FROM textbook WHERE user_id = ? AND id = ?`, 
            [user_id, textbookId]
        );

        if (!textbook) {
            return NextResponse.json({ error: 'Textbook not found or you do not have permission.' }, { status: 404 });
        }

        // Delete the database record
        const [result] = await queryWithRetry(
            `DELETE FROM textbook WHERE user_id = ? AND id = ?`, 
            [user_id, textbookId]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Failed to delete textbook.' }, { status: 500 });
        }

        // Delete files from R2 (fire-and-forget)
        const deleteFiles = async () => {
            try {
                // Remove leading slashes from all paths
                const filesToDelete = [
                    textbook.textbookTXTFilePath,
                    textbook.explanationFilePath,
                    textbook.originalFilePath
                ]
                .filter(Boolean) // Remove any null/undefined paths
                .map(path => path.startsWith('/') ? path.slice(1) : path);

                await Promise.all(
                    filesToDelete.map(path => 
                        r2.send(new DeleteObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Key: path
                        }))
                    )
                );
            } catch (error) {
                console.error('Error deleting textbook files from R2:', error);
                // Log but don't fail the request
            }
        };

        // Run in background (don't await)
        deleteFiles();

        return NextResponse.json({ message: 'Textbook deleted successfully' }, { status: 200 });

    } catch (error) {
        console.error("Delete Textbook Error:", error);
        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}