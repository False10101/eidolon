import { Worker } from "bullmq";
import fs from 'fs';
import connection from "../redis.js";
import { sql } from "../storage/db.js";
import { getAudioClient } from "./audioClient.js";
import getAudioDuration from '../audio-converter-queues/duration.js';
import path from "path";
import { v4 as uuidv4 } from "uuid";



const worker = new Worker('transcription', async (job) => {
    const { inputPath, label, model, userId, vad, outputFormat, fileName, diarization } = job.data;
    const tempDir = `./tmp-transcript/${job.id}/`
    const transcript_uuid = uuidv4();

    const duration = await getAudioDuration(inputPath)

    const durationHours = (duration) / 3600;
    const premiumModel = (model === 'whisper-v3');

    const rate = premiumModel ? 4 : 2.5;

    let transcriptionPrice;
    if (durationHours < 1) {
        transcriptionPrice = premiumModel ? 4 : 2.5;
    } else if (durationHours < 2) {
        transcriptionPrice = premiumModel ? 8 : 5;
    } else if (durationHours < 3) {
        transcriptionPrice = premiumModel ? 12 : 7.5;
    } else {
        transcriptionPrice = Math.round(durationHours * rate * 1.2);
    }


    await job.updateProgress(20);
    const vadEnabled = vad === 'true' || vad === true;

    const rows = await sql`
        INSERT INTO transcript (user_id, label, status, charge_amount, created_at, filename, public_id, duration, model, output_format, vad_enabled)
        VALUES (${userId}, ${label}, ${'Initializing'}, ${transcriptionPrice}, NOW(), ${fileName}, ${transcript_uuid}, ${duration}, ${model}, ${outputFormat || 'text'}, ${vadEnabled})
        RETURNING id
    `;
    const transcriptId = rows[0].id;

    await sql`UPDATE transcript SET status = 'Transcribing' WHERE user_id = ${userId} AND id = ${transcriptId}`;

    try {
        const fileStream = fs.createReadStream(inputPath);

        const params = {
            file: fileStream,
            model: model,
            temperature: 0.0
        };

        if (vad === 'true' || vad === true) {
            params.vad_model = 'silero';
        }

        if (outputFormat === 'verbose_json') {
            params.response_format = 'verbose_json';
            params.timestamp_granularities = ['word','segment'];

            if(diarization === 'true'){
                params.diarize = diarization;
            }
        } else {
            params.response_format = 'text';
        }

        await job.updateProgress(40);

        const audioClient = getAudioClient(model);

        let response = await audioClient.audio.transcriptions.create(params);

        if (typeof response === 'string') {
            try {
                response = JSON.parse(response);
            } catch (e) {
            }
        }


        let transcriptContent = "";
        let segments = null;

        if (typeof response === 'object' && response !== null) {
            transcriptContent = response.text || "";

            if (response.segments && Array.isArray(response.segments)) {
                segments = response.segments.map(segment => ({
                    id: segment.id,
                    start: segment.start,
                    end: segment.end,
                    text: segment.text.trim(),
                    speaker_id: segment.speaker_id
                }));
            }
        } else if (typeof response === 'string') {
            transcriptContent = response;
        }


        await job.updateProgress(90);

        await sql.begin(async (tx) => {
            await tx`UPDATE transcript SET status = 'Completed', content = ${transcriptContent}, segments = ${segments ? JSON.stringify(segments) : null} WHERE id = ${transcriptId}`;

            const [updated] = await tx`
                UPDATE "user" SET balance = balance - ${transcriptionPrice}
                WHERE id = ${userId}
                RETURNING balance
            `;

            await tx`
                INSERT INTO "activity" (type, title, charge_amount, balance_after, date, user_id, respective_table_id, status)
                VALUES ('transcript', ${label}, ${transcriptionPrice}, ${updated.balance}, NOW(), ${userId}, ${transcriptId}, 'Completed')
            `;
        });

        await job.updateProgress(100);

        return { publicId: transcript_uuid };

    } catch (err) {
        await sql`UPDATE transcript SET status = 'Failed' WHERE id = ${transcriptId}`;
        throw err;
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(tempDir)) {
            fs.readdirSync(tempDir).forEach(f => fs.unlinkSync(path.join(tempDir, f)));
            fs.rmdirSync(tempDir);
        }
    }
}, {
    connection,
    concurrency: 1,
});

worker.on('completed', (job) => console.log(`Job ${job.id} done!`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));