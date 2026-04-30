import { verifyUserData } from "@/lib/auth/verify";
import { r2, GetObjectCommand } from "@/lib/r2";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { audioQueue } from "@/lib/queue";

const ALLOWED_FORMATS = new Set(['mp3', 'm4a', 'wav']);

export async function GET(req, { params }) {
    const userId = await verifyUserData(req);
    if (userId === null) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, format } = await params;
    const normalizedFormat = String(format).toLowerCase();

    if (!ALLOWED_FORMATS.has(normalizedFormat)) {
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const job = await audioQueue.getJob(jobId);
    if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.data.userId !== userId) {
        console.warn(`User ${userId} tried to download User ${job.data.userId}'s converted file`);
        return NextResponse.json({ error: "Forbidden: This is not your file" }, { status: 403 });
    }

    const key = `${jobId}.${normalizedFormat}`;

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
