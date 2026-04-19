import { NextResponse } from "next/server";
import { transcriptorQueue } from "@/lib/queue";
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
        const language = formData.get('language');

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name;
        const tempDir = './tmp-transcript';
        await mkdir(tempDir, { recursive: true });

        inputPath = path.join(tempDir, `input-${Date.now()}-${fileName}`);
        await writeFile(inputPath, buffer);

        const durationHours = (await getAudioDuration(inputPath)) / 3600;
        const isEnglish = language === 'en';

        let transcriptionPrice;
        if (durationHours < 1) {
            transcriptionPrice = isEnglish ? 2 : 6;
        } else if (durationHours < 2) {
            transcriptionPrice = isEnglish ? 4 : 12;
        } else if (durationHours < 3) {
            transcriptionPrice = isEnglish ? 6 : 18;
        } else {
            const rate = isEnglish ? 2 : 6;
            transcriptionPrice = Math.round(durationHours * rate * 1.2);
        }

        const balance = await sql`SELECT balance FROM "user" WHERE id = ${userId}`;

        if (balance[0].balance < transcriptionPrice) {
            await unlink(inputPath);
            return NextResponse.json({ error: "Not enough balance." }, { status: 400 });
        }
        const job = await transcriptorQueue.add('transcribe', {
            inputPath,
            userId,
            label,
            language,
            fileName,
        });

        return NextResponse.json({ jobId: job.id, })

    } catch (error) {
        if (inputPath) await unlink(inputPath).catch(() => { });
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}