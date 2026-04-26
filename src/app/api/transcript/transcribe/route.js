import { NextResponse } from "next/server";
import { transcriptorQueue } from "@/lib/queue";
import { rateLimit } from "@/lib/rateLimit";
import { mkdir, writeFile, unlink } from 'fs/promises';
import { verifyUserData } from "@/lib/auth/verify";
import { sql } from "@/lib/storage/db";
import getAudioDuration from "@/lib/audio-converter-queues/duration";
import path from "path";

export async function POST(req) {
    let inputPath = null;

    try {
        const userId = await verifyUserData(req);

        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimit(`rl:transcript:${userId}`, 10, 60);
        if (limited) return limited;

        const inProgress = await sql`
            SELECT 1 FROM note
            WHERE user_id = ${userId}
            AND status IN ('pending', 'reading', 'generating', 'saving')
            UNION ALL
            SELECT 1 FROM note
            WHERE status IN ('pending', 'reading', 'generating', 'saving')
            AND id IN (
                SELECT note_id FROM note_access WHERE user_id = ${userId}
            )
            UNION ALL
            SELECT 1 FROM exam_prep
            WHERE user_id = ${userId}
            AND status IN ('Pending', 'Reading', 'Generating', 'Saving')
            UNION ALL
            SELECT 1 FROM exam_prep
            WHERE status IN ('Pending', 'Reading', 'Generating', 'Saving')
            AND id IN (
                SELECT exam_prep_id FROM exam_prep_access WHERE user_id = ${userId}
            )
            UNION ALL
            SELECT 1 FROM transcript
            WHERE user_id = ${userId}
            AND status IN ('Initializing', 'Transcribing')
            LIMIT 1
        `;
        if (inProgress.length > 0) {
            return NextResponse.json({ error: 'You already have a generation in progress. Please wait for it to complete.' }, { status: 400 });
        }

        const counts = await transcriptorQueue.getJobCounts('wait', 'active');
        if (counts.wait + counts.active >= 11) {
            return NextResponse.json({ error: "Queue is full" }, { status: 429 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        const label = formData.get('label') || file.name.split(".")[0];
        const model = formData.get('model') || 'whisper-v3-turbo';
        const vad = formData.get('vad') || 'true';
        const outputFormat = formData.get('outputFormat') || 'text';
        const diarization = formData.get('diarization') || 'false';

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size > 500 * 1024 * 1024) {
            return NextResponse.json({ error: 'File is too large. Maximum size is 500MB.' }, { status: 400 });
        }

        const ALLOWED_AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.flac', '.aac', '.webm'];
        const fileName = path.basename(file.name);
        const fileExt = path.extname(fileName).toLowerCase();
        if (!ALLOWED_AUDIO_EXTS.includes(fileExt)) {
            return NextResponse.json({ error: 'Invalid file type. Allowed: mp3, wav, m4a, mp4, ogg, flac, aac, webm' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const tempDir = './tmp-transcript';
        await mkdir(tempDir, { recursive: true });

        inputPath = path.join(tempDir, `input-${Date.now()}-${fileName}`);
        await writeFile(inputPath, buffer);

        const durationHours = (await getAudioDuration(inputPath)) / 3600;

        if (durationHours <= 0) {
            await unlink(inputPath);
            return NextResponse.json({ error: 'Could not determine audio duration.' }, { status: 400 });
        }

        if (durationHours >= 10) {
            return NextResponse.json({ error: "Audio duration exceeds our 10-hour limit." }, { status: 400 });
        }

        const premiumModel = model === 'whisper-v3';
        const rate = premiumModel ? 11 : 7;
        const transcriptionPrice = Math.ceil(durationHours) * rate;

        const [held] = await sql`UPDATE "user" SET balance = balance - ${transcriptionPrice} WHERE id = ${userId} AND balance >= ${transcriptionPrice} RETURNING id`;
        if (!held) {
            await unlink(inputPath);
            return NextResponse.json({ error: "Not enough balance." }, { status: 400 });
        }

        const job = await transcriptorQueue.add('transcribe', {
            inputPath,
            userId,
            label,
            model,
            vad,
            fileName,
            outputFormat,
            diarization,
            transcriptionPrice
        });

        return NextResponse.json({ jobId: job.id })

    } catch (error) {
        if (inputPath) await unlink(inputPath).catch(() => { });
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}