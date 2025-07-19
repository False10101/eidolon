import jwt from 'jsonwebtoken';
import { queryWithRetry } from "@/lib/queryWithQuery";
import { DeleteBucketCommand } from '@aws-sdk/client-s3';
import { r2 } from "@/lib/r2";

export async function GET(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;
        const { searchParams } = new URL(req.url);
        const documentId = searchParams.get('id');

        if( !documentId) {
            return new Response(JSON.stringify({ error: 'Document ID is required.' }), { status: 400 });
        }

        const [[document]] = await queryWithRetry(`SELECT * FROM document WHERE user_id = ? AND id = ? `, [user_id, documentId]);

        if (!document) {
            return new Response(JSON.stringify({ error: 'Document not found or you do not have permission.' }), { status: 404 });
        }

        const [result] = await queryWithRetry(`DELETE FROM document WHERE user_id = ? AND id = ?`, [user_id, documentId]);

        if (result.affectedRows === 0) {
            return new Response(JSON.stringify({ error: 'Failed to delete document.' }), { status: 500 });
        }

        const cleanR2Path = (path) => {
            if (!path) return null;
            return path.startsWith('/') ? path.slice(1) : path;
        };

        const deleteFiles = async () => {
            try {
                const filesToDelete = [
                    cleanR2Path(document.generatedFilePath),
                ].filter(Boolean);

                await Promise.all(
                    filesToDelete.map(path => 
                        r2.send(new DeleteBucketCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Key: path
                        }))
                    )
                );
            } catch (error) {
                console.error(`Error deleting files from R2:`, error);
            }
        };

        deleteFiles();
        return new Response(JSON.stringify({ message: 'Document deleted successfully.' }), { status: 200 });

    } catch (error) {
        console.error('Error deleting document:', error);
        // Handle potential expired token errors
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token.' }), { status: 401 });
        }
        return new Response(JSON.stringify({ error: 'Failed to delete document.' }), { status: 500 });
    }
}