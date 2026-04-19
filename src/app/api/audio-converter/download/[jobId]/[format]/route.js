import { verifyUserData } from "@/lib/auth/verify";
import { r2, GetObjectCommand } from "@/lib/r2";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    const userId = await verifyUserData(req);
    if (userId === null) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, format } = await params;
    const key = `${jobId}.${format}`;

    try {
        // check if file actually exists first
        await r2.send(new HeadObjectCommand({
            Bucket: process.env.R2_DUMP_BUCKET_NAME,
            Key: key,
        }));

        const url = await getSignedUrl(r2, new GetObjectCommand({
            Bucket: process.env.R2_DUMP_BUCKET_NAME,
            Key: key,
        }), { expiresIn: 30 });

        return NextResponse.json({ url });
    } catch {
        return NextResponse.json({ error: 'expired' }, { status: 404 });
    }
}