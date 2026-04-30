import { NextResponse } from "next/server";
import { audioQueue } from "@/lib/queue";
import { mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from "path";
import Busboy from 'busboy';
import { Readable } from 'stream';
import { verifyUserData } from "@/lib/auth/verify";
import getAudioDuration from "@/lib/audio-converter-queues/duration";
import { rateLimit } from "@/lib/rateLimit";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm']);
const ALLOWED_FORMATS = ['MP3', 'WAV', 'M4A'];
const ALLOWED_BITRATES = ['128 kbps', '192 kbps', '256 kbps'];

async function cleanupTempFile(tempFilePath) {
    if (!tempFilePath) return;
    try {
        const { unlink } = await import('fs/promises');
        await unlink(tempFilePath);
    } catch (_) {}
}

export async function POST(req) {
    let tempFilePath = '';
    try {
        const userId = await verifyUserData(req);

        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limited = await rateLimit(`rl:audio-convert:${userId}`, 10, 60);
        if (limited) return limited;

        const contentLength = Number(req.headers.get('content-length'));
        if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: "File is too large. Maximum size is 500MB." }, { status: 400 });
        }

        // 1. Capacity Check: Wait + Active (VPS Safety)
        const counts = await audioQueue.getJobCounts('wait', 'active');
        if (counts.wait + counts.active >= 11) {
            return NextResponse.json({ error: "Queue is full" }, { status: 429 });
        }

        const tmpDir = path.join(process.cwd(), 'tmp');
        await mkdir(tmpDir, { recursive: true });

        // 2. Setup Busboy
        const headers = Object.fromEntries(req.headers);
        const busboy = Busboy({
            headers,
            limits: {
                files: 1,
                fileSize: MAX_UPLOAD_BYTES,
            },
        });

        let fileName = '';
        let format = 'MP3';
        let bitrate = '192 kbps';
        let start = null;
        let end = null;
        let postAction = null;
        let model = 'whisper-v3-turbo';
        let outputFormat = 'text';
        let writeStream = null;
        let uploadError = null;
        let sawFile = false;

        const uploadPromise = new Promise((resolve, reject) => {
            busboy.on('file', (name, file, info) => {
                sawFile = true;
                fileName = path.basename(info.filename);
                const ext = path.extname(fileName).toLowerCase();

                if (!ALLOWED_VIDEO_EXTS.has(ext)) {
                    uploadError = new Error('Invalid file type. Allowed: mp4, mov, mkv, avi, webm');
                    file.resume();
                    return;
                }

                tempFilePath = path.join(tmpDir, `${Date.now()}-${fileName}`);
                writeStream = createWriteStream(tempFilePath);

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
                if (name === 'format' && ALLOWED_FORMATS.includes(val)) format = val;
                if (name === 'bitrate' && ALLOWED_BITRATES.includes(val)) bitrate = val;
                if (name === 'start' && val) start = val;
                if (name === 'end' && val) end = val;
                if (name === 'postAction' && val) postAction = val;
                if (name === 'model' && ['whisper-v3-turbo', 'whisper-v3'].includes(val)) model = val;
                if (name === 'outputFormat' && ['text', 'verbose_json'].includes(val)) outputFormat = val;
            });

            busboy.on('filesLimit', () => reject(new Error('Only one file is allowed.')));
            busboy.on('error', reject);
            busboy.on('finish', () => {
                if (uploadError) return reject(uploadError);
                if (!sawFile) return reject(new Error('No file provided'));
                if (!writeStream) return reject(new Error('No file provided'));
            });
        });

        // 3. Pipe the Web Stream to Node Stream
        const nodeStream = Readable.fromWeb(req.body);
        nodeStream.pipe(busboy);

        // Wait for the file to finish writing to the SSD
        await uploadPromise;
        const durationSeconds = await getAudioDuration(tempFilePath);
        let effectiveDurationSeconds = durationSeconds;

        if (start || end) {
            const toSeconds = (t) => {
                if (!t) return 0;
                const [h, m, s] = t.split(':').map(Number);
                return h * 3600 + m * 60 + s;
            };
            const startSec = toSeconds(start);
            const endSec = end ? toSeconds(end) : durationSeconds;
            effectiveDurationSeconds = endSec - startSec;
        }

        if (!Number.isFinite(effectiveDurationSeconds) || effectiveDurationSeconds <= 0) {
            await cleanupTempFile(tempFilePath);
            tempFilePath = '';
            return NextResponse.json({ error: "Invalid trim range or media duration." }, { status: 400 });
        }

        const durationHours = Math.ceil(effectiveDurationSeconds / 3600);
        const rate = model === 'whisper-v3-turbo' ? 7 : 11;
        const transcriptionPrice = durationHours * rate;

        if (durationHours >= 10) {
            await cleanupTempFile(tempFilePath);
            tempFilePath = '';
            return NextResponse.json({ error: "Video duration exceeds our 10-hour limit." }, { status: 400 });
        }

        // 4. Add to Queue (Fixed: used fileName instead of file.name)
        const job = await audioQueue.add('extract-audio', {
            userId: userId,
            inputPath: tempFilePath,
            fileName: fileName, // Corrected variable
            format,
            bitrate,
            durationSeconds,
            start,
            end,
            model,
            autoTranscribe: postAction === 'transcribe' || postAction === 'both',
            transcriptionPrice,
            label: fileName.split('.')[0],
            outputFormat
        });

        tempFilePath = '';
        return NextResponse.json({ jobId: job.id });
    } catch (error) {
        await cleanupTempFile(tempFilePath);
        console.error("Upload error:", error);

        const message = error instanceof Error ? error.message : '';
        if (
            message === 'No file provided' ||
            message === 'Only one file is allowed.' ||
            message === 'Invalid file type. Allowed: mp4, mov, mkv, avi, webm' ||
            message === 'File is too large. Maximum size is 500MB.'
        ) {
            return NextResponse.json({ error: message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};
