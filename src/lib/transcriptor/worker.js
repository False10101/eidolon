import { Worker } from "bullmq";
import Ffmpeg from "fluent-ffmpeg";
import fs from 'fs';
import { mkdir } from "fs/promises";
import connection from "../redis.js";
import { sql } from "../storage/db.js";
import { audioClient } from "../openai.js";
import getAudioDuration from '../audio-converter-queues/duration.js';
import path from "path";
import { v4 as uuidv4 } from "uuid";

const TRANSCRIPTION_CHUNK_SECONDS = 10 * 60;

function buildChunkPlan(durationSeconds) {
    const chunks = [];

    for (let start = 0, index = 0; start < durationSeconds; start += TRANSCRIPTION_CHUNK_SECONDS, index += 1) {
        chunks.push({
            index,
            start,
            duration: Math.min(TRANSCRIPTION_CHUNK_SECONDS, durationSeconds - start),
        });
    }

    return chunks;
}

async function exportAudioChunk(inputPath, outputPath, { start, duration }) {
    await new Promise((resolve, reject) => {
        Ffmpeg(inputPath)
            .noVideo()
            .setStartTime(start)
            .setDuration(duration)
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .on('error', reject)
            .on('end', resolve)
            .save(outputPath);
    });
}

function normalizeTranscriptionResponse(response) {
    let parsed = response;

    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch (e) {
        }
    }

    if (typeof parsed === 'object' && parsed !== null) {
        return {
            text: parsed.text || '',
            segments: Array.isArray(parsed.segments)
                ? parsed.segments.map(segment => ({
                    id: segment.id,
                    start: segment.start,
                    end: segment.end,
                    text: (segment.text || '').trim(),
                    speaker_id: segment.speaker_id ?? null
                }))
                : null,
        };
    }

    return {
        text: typeof parsed === 'string' ? parsed : '',
        segments: null,
    };
}

function offsetSegments(segments, offsetSeconds) {
    if (!Array.isArray(segments)) return null;

    return segments.map((segment, index) => ({
        ...segment,
        id: segment.id ?? index,
        start: (segment.start ?? 0) + offsetSeconds,
        end: (segment.end ?? 0) + offsetSeconds,
    }));
}

async function updateChunkProgress(job, percent, label, currentChunk = null, totalChunks = null) {
    await job.updateProgress({
        percent,
        label,
        currentChunk,
        totalChunks,
    });
}

const worker = new Worker('transcription', async (job) => {
    const { inputPath, label, model, userId, outputFormat, fileName, transcriptionPrice } = job.data;
    const tempDir = `./tmp-transcript/${job.id}/`;
    const transcript_uuid = uuidv4();
    
    let transcriptId = null;

    try {
        await mkdir(tempDir, { recursive: true });
        const duration = await getAudioDuration(inputPath);

        await updateChunkProgress(job, 15, 'Preparing transcript');
        const vadEnabled = false;

        const rows = await sql`
            INSERT INTO transcript (user_id, label, status, charge_amount, created_at, filename, public_id, duration, model, output_format, vad_enabled)
            VALUES (${userId}, ${label}, ${'Initializing'}, ${transcriptionPrice}, NOW(), ${fileName}, ${transcript_uuid}, ${duration}, ${model}, ${outputFormat || 'text'}, ${vadEnabled})
            RETURNING id
        `;
        transcriptId = rows[0].id;

        await sql`UPDATE transcript SET status = 'Transcribing' WHERE user_id = ${userId} AND id = ${transcriptId}`;

        const transcriptionInputPath = inputPath;
        const transcriptionDuration = duration;
        const chunkPlan = buildChunkPlan(transcriptionDuration);
        const transcriptParts = [];
        let segments = null;

        await updateChunkProgress(
            job,
            25,
            chunkPlan.length > 1 ? `Prepared ${chunkPlan.length} chunks` : 'Prepared audio',
            0,
            chunkPlan.length
        );

        for (const chunk of chunkPlan) {
            const chunkNumber = chunk.index + 1;
            const chunkPath = path.join(tempDir, `chunk-${chunkNumber}.mp3`);

            await updateChunkProgress(
                job,
                25 + Math.round(((chunk.index) / chunkPlan.length) * 60),
                chunkPlan.length > 1 ? `Transcribing chunk ${chunkNumber} of ${chunkPlan.length}` : 'Transcribing audio',
                chunkNumber,
                chunkPlan.length
            );

            await exportAudioChunk(transcriptionInputPath, chunkPath, chunk);

            const fileStream = fs.createReadStream(chunkPath);
            const params = {
                file: fileStream,
                model: model,
                temperature: 0.0
            };

            if (outputFormat === 'verbose_json') {
                params.response_format = 'verbose_json';
                params.timestamp_granularities = ['word','segment'];
            } else {
                params.response_format = 'text';
            }

            const response = await audioClient.audio.transcriptions.create(params);
            const normalized = normalizeTranscriptionResponse(response);

            if (normalized.text) {
                transcriptParts.push(normalized.text.trim());
            }

            if (outputFormat === 'verbose_json' && normalized.segments) {
                const offsetChunkSegments = offsetSegments(normalized.segments, chunk.start);
                segments = segments ? segments.concat(offsetChunkSegments) : offsetChunkSegments;
            }

            await updateChunkProgress(
                job,
                25 + Math.round((chunkNumber / chunkPlan.length) * 60),
                chunkPlan.length > 1 ? `Finished chunk ${chunkNumber} of ${chunkPlan.length}` : 'Transcription finished',
                chunkNumber,
                chunkPlan.length
            );
        }

        const transcriptContent = transcriptParts.join('\n\n').trim();

        await updateChunkProgress(job, 92, 'Saving transcript', chunkPlan.length, chunkPlan.length);

        await sql.begin(async (tx) => {
            await tx`UPDATE transcript SET status = 'Completed', content = ${transcriptContent}, segments = ${segments ? JSON.stringify(segments) : null} WHERE id = ${transcriptId}`;

            const [user] = await tx`SELECT balance FROM "user" WHERE id = ${userId}`;

            await tx`
                INSERT INTO "activity" (type, title, charge_amount, balance_after, date, user_id, respective_table_id, status)
                VALUES ('transcript', ${label}, ${transcriptionPrice}, ${user.balance}, NOW(), ${userId}, ${transcriptId}, 'Completed')
            `;
        });

        await updateChunkProgress(job, 100, 'Completed', chunkPlan.length, chunkPlan.length);

        return { publicId: transcript_uuid };

    } catch (err) {
        if (transcriptId) {
            await sql`UPDATE transcript SET status = 'Failed' WHERE id = ${transcriptId}`;
        }
        
        await sql`UPDATE "user" SET balance = balance + ${transcriptionPrice} WHERE id = ${userId}`;
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
