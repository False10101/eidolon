import { NextResponse } from "next/server";
import { transcriptorQueue } from "@/lib/queue";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req, { params }) {

    const currentUserId = await verifyUserData(req);
    if (!currentUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await transcriptorQueue.getJob(jobId);

    if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.data.userId !== currentUserId) {
        console.warn(`User ${currentUserId} tried to access User ${job.data.userId}'s job!`);
        return NextResponse.json({ error: "Forbidden: This is not your job" }, { status: 403 });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;

    let queuePosition = null;
    if (state === 'waiting') {
        const waitingJobs = await audioQueue.getWaiting();
        const idx = waitingJobs.findIndex(j => j.id === job.id);
        queuePosition = idx === -1 ? null : idx + 1; // 1-based
    }

    return NextResponse.json({
        state,
        progress,
        publicId: result?.publicId || null,
        queuePosition
    });
}