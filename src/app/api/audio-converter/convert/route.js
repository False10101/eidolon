import { NextResponse } from "next/server";
import { audioQueue } from "@/lib/queue";
import { mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from "path";
import Busboy from 'busboy';
import { Readable } from 'stream';
import { verifyUserData } from "@/lib/auth/verify";
import getAudioDuration from "@/lib/audio-converter-queues/duration";

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);

        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        const busboy = Busboy({ headers });

        let tempFilePath = '';
        let fileName = '';
        let format = 'MP3';
        let bitrate = '192 kbps';
        let start = null; 
        let end = null;

        const uploadPromise = new Promise((resolve, reject) => {
            busboy.on('file', (name, file, info) => {
                fileName = info.filename;
                tempFilePath = path.join(tmpDir, `${Date.now()}-${fileName}`);
                const writeStream = createWriteStream(tempFilePath);
                
                file.pipe(writeStream);
                
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            busboy.on('field', (name, val) => {
                if (name === 'format') format = val;
                if (name === 'bitrate') bitrate = val;
                if (name === 'start' && val) start = val;
                if (name === 'end' && val) end = val;
            });

            busboy.on('error', reject);
        });

        // 3. Pipe the Web Stream to Node Stream
        const nodeStream = Readable.fromWeb(req.body);
        nodeStream.pipe(busboy);

        // Wait for the file to finish writing to the SSD
        await uploadPromise;
        const durationSeconds = await getAudioDuration(tempFilePath);


        // 4. Add to Queue (Fixed: used fileName instead of file.name)
        const job = await audioQueue.add('extract-audio', {
            userId: userId,
            inputPath: tempFilePath,
            fileName: fileName, // Corrected variable
            format,
            bitrate,
            durationSeconds,
            start,
            end
        });

        return NextResponse.json({ jobId: job.id });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};