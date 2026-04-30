import { NextResponse } from "next/server";
import { transcriptorQueue } from "@/lib/queue";
import { rateLimit } from "@/lib/rateLimit";
import { mkdir, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { verifyUserData } from "@/lib/auth/verify";
import { sql } from "@/lib/storage/db";
import getAudioDuration from "@/lib/audio-converter-queues/duration";
import path from "path";
import Busboy from 'busboy';
import { Readable } from 'stream';

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
const ALLOWED_AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.flac', '.aac', '.webm']);

async function cleanupTempFile(inputPath) {
    if (!inputPath) return;
    await unlink(inputPath).catch(() => {});
}

export async function POST(req) {
    let inputPath = null;

    try {
        const userId = await verifyUserData(req);

        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimit(`rl:transcript:${userId}`, 10, 60);
        if (limited) return limited;

        const contentLength = Number(req.headers.get('content-length'));
        if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: 'File is too large. Maximum size is 500MB.' }, { status: 400 });
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

        const tempDir = './tmp-transcript';
        await mkdir(tempDir, { recursive: true });

        const headers = Object.fromEntries(req.headers);
        const busboy = Busboy({
            headers,
            limits: {
                files: 1,
                fileSize: MAX_UPLOAD_BYTES,
            },
        });

        let fileName = '';
        let label = '';
        let model = 'whisper-v3-turbo';
        let vad = 'true';
        let outputFormat = 'text';
        let diarization = 'false';
        let sawFile = false;
        let writeStream = null;
        let uploadError = null;

        const uploadPromise = new Promise((resolve, reject) => {
            busboy.on('file', (name, file, info) => {
                sawFile = true;
                fileName = path.basename(info.filename);
                const fileExt = path.extname(fileName).toLowerCase();

                if (!ALLOWED_AUDIO_EXTS.has(fileExt)) {
                    uploadError = new Error('Invalid file type. Allowed: mp3, wav, m4a, mp4, ogg, flac, aac, webm');
                    file.resume();
                    return;
                }

                if (!label) {
                    label = fileName.split('.')[0];
                }

                inputPath = path.join(tempDir, `input-${Date.now()}-${fileName}`);
                writeStream = createWriteStream(inputPath);
                file.pipe(writeStream);

                file.on('limit', () => {
                    uploadError = new Error('File is too large. Maximum size is 500MB.');
                    writeStream.destroy(uploadError);
                });

                file.on('error', reject);
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            busboy.on('field', (name, val) => {
                if (name === 'label' && val) label = String(val).slice(0, 255);
                if (name === 'model' && ['whisper-v3-turbo', 'whisper-v3'].includes(val)) model = val;
                if (name === 'vad' && val) vad = val;
                if (name === 'outputFormat' && ['text', 'verbose_json'].includes(val)) outputFormat = val;
                if (name === 'diarization') diarization = val === 'true' ? 'true' : 'false';
            });

            busboy.on('filesLimit', () => reject(new Error('Only one file is allowed.')));
            busboy.on('error', reject);
            busboy.on('finish', () => {
                if (uploadError) return reject(uploadError);
                if (!sawFile || !writeStream) return reject(new Error('No file provided'));
            });
        });

        const nodeStream = Readable.fromWeb(req.body);
        nodeStream.pipe(busboy);
        await uploadPromise;

        const durationHours = (await getAudioDuration(inputPath)) / 3600;

        if (durationHours <= 0) {
            await cleanupTempFile(inputPath);
            inputPath = null;
            return NextResponse.json({ error: 'Could not determine audio duration.' }, { status: 400 });
        }

        if (durationHours >= 10) {
            await cleanupTempFile(inputPath);
            inputPath = null;
            return NextResponse.json({ error: "Audio duration exceeds our 10-hour limit." }, { status: 400 });
        }

        const premiumModel = model === 'whisper-v3';
        const rate = premiumModel ? 11 : 7;
        const transcriptionPrice = Math.ceil(durationHours) * rate;

        const [held] = await sql`UPDATE "user" SET balance = balance - ${transcriptionPrice} WHERE id = ${userId} AND balance >= ${transcriptionPrice} RETURNING id`;
        if (!held) {
            await cleanupTempFile(inputPath);
            inputPath = null;
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

        inputPath = null;
        return NextResponse.json({ jobId: job.id })

    } catch (error) {
        await cleanupTempFile(inputPath);
        console.error(error);

        const message = error instanceof Error ? error.message : '';
        if (
            message === 'No file provided' ||
            message === 'Only one file is allowed.' ||
            message === 'File is too large. Maximum size is 500MB.' ||
            message === 'Invalid file type. Allowed: mp3, wav, m4a, mp4, ogg, flac, aac, webm'
        ) {
            return NextResponse.json({ error: message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
