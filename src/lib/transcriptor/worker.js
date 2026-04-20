import { Worker } from "bullmq";
import fs from 'fs';
import connection from "../redis.js";
import { sql } from "../storage/db.js";
import splitAudioChunks from "./splitAudioChunks.js";
import Groq from "groq-sdk";
import getAudioDuration from '../audio-converter-queues/duration.js';
import path from "path";
import { v4 as uuidv4 } from "uuid";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const worker = new Worker('transcription', async (job) => {
    const { inputPath, label, language, userId, fileName } = job.data;
    const tempDir = `./tmp-transcript/${job.id}/`
    const transcript_uuid = uuidv4();

    const maxFileSize = 19 * 1024 * 1024;

    const duration = await getAudioDuration(inputPath)

    const durationHours = (duration) / 3600;
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

    await job.updateProgress(20);

    const model = language === "en" ? "whisper-large-v3-turbo" : "whisper-large-v3";

    const rows = await sql`
        INSERT INTO transcript (user_id, label, language, diarization, status, charge_amount, created_at, filename, public_id, duration)
        VALUES (${userId}, ${label}, ${language}, ${0}, ${'Initializing'}, ${transcriptionPrice}, NOW(), ${fileName}, ${transcript_uuid}, ${duration})
        RETURNING id
    `;
    const transcriptId = rows[0].id;

    const audioChunks = await splitAudioChunks(inputPath, maxFileSize, tempDir);
    let fullTranscript = "";

    await sql`UPDATE transcript SET status = 'Transcribing' WHERE user_id = ${userId} AND id = ${transcriptId}`;

    try {
        for (let i = 0; i < audioChunks.length; i++) {
            const chunkTranscription = await groq.audio.transcriptions.create({
                file: fs.createReadStream(audioChunks[i]),
                model: model,
                prompt: "",
                response_format: 'text',
                language: language,
                temperature: 0.0
            });

            fullTranscript += chunkTranscription + '\n\n';
            await job.updateProgress(Math.round(20 + ((i + 1) / audioChunks.length) * 75));
        }

        await sql.begin(async (tx) => {
            await tx`UPDATE transcript SET status = 'Completed', content = ${fullTranscript} WHERE id = ${transcriptId}`;

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