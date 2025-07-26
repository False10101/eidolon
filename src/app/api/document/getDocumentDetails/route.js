import jwt from 'jsonwebtoken';
import { queryWithRetry } from "@/lib/queryWithQuery";
import { r2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(req) {
    const cookies = req.headers.get('cookie');
    const token = cookies ? cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;
    const { searchParams } = new URL(req.url);

    const document_id = searchParams.get('document_id');

    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.id;

        const [[document]] = await queryWithRetry("SELECT *, CONVERT_TZ(created_at, @@session.time_zone, '+00:00') as created_at_utc from document where user_id = ? AND id = ?", [user_id, document_id]);

        if (!document) {
            return new Response(JSON.stringify({ error: 'Document Not Found' }), { status: 400 });
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

        const documentFileContent = await readR2File(document.generatedFilePath);


        const responseData = {
            ...document,  // Spread all document properties
            created_at: document.created_at_utc || document.created_at,
            files: {
                documentFile: {
                    content: documentFileContent,
                    path: document.generatedFilePath
                }
            }
        }

        return new Response(JSON.stringify(responseData), { status: 200 });
    } catch (error) {
        console.error('Error fetching document details:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 401 });

    }
}