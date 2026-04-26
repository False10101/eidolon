import { Worker } from "bullmq";
import Ffmpeg from "fluent-ffmpeg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import { mkdir, copyFile } from 'fs/promises';
import connection from "../redis.js";
import { sql } from "../storage/db.js";
import { transcriptorQueue } from "../queue.js";

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const codecMap = {
  mp3: 'libmp3lame',
  m4a: 'aac',
  wav: 'pcm_s16le',
};

const timeToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return (hours * 3600) + (minutes * 60) + seconds;
};

const timemarkToSeconds = (timemark) => {
  if (!timemark) return 0;
  const parts = timemark.split(':').map(parseFloat);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

const worker = new Worker('audio-conversion', async (job) => {
  const { inputPath, fileName, format, bitrate, durationSeconds, userId, start, end, model, autoTranscribe, transcriptionPrice, label, outputFormat } = job.data;
  const outputFileName = `${job.id}.${format.toLowerCase()}`;
  const outputPath = `./tmp-convert/out-${outputFileName}`;
  const codec = codecMap[format.toLowerCase()] || 'libmp3lame';

  console.log(`Processing job ${job.id}: ${inputPath}`);

  await mkdir('./tmp-convert', { recursive: true });
  let transcriptJobId = null;

  try {
    await new Promise((resolve, reject) => {
      let command = Ffmpeg(inputPath)
        .noVideo()
        .audioCodec(codec)
        .audioBitrate(bitrate.replace(' kbps', 'k'));

      if (start && end) {
        const duration = timeToSeconds(end) - timeToSeconds(start);
        command = command.setStartTime(start).setDuration(duration);
      } else if (start) {
        command = command.setStartTime(start);
      } else if (end) {
        command = command.outputOptions(['-to', end]);
      }

      command
        .on('progress', (p) => {
          if (p.timemark && durationSeconds) {
            const elapsed = timemarkToSeconds(p.timemark);
            const pct = Math.min(94, Math.round((elapsed / durationSeconds) * 95));
            job.updateProgress(pct);
          }
        })
        .on('error', reject)
        .on('end', resolve)
        .save(outputPath);
    });

    const fileStream = fs.createReadStream(outputPath);
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_DUMP_BUCKET_NAME,
      Key: outputFileName,
      Body: fileStream,
      ContentType: `audio/${format.toLowerCase()}`,
      ContentDisposition: `attachment; filename="${fileName.split('.')[0]}.${format.toLowerCase()}"`
    }));

    await job.updateProgress(99);

    await sql`INSERT INTO audio_converter_logs (user_id, duration_seconds) VALUES (${userId}, ${durationSeconds})`;

    if (autoTranscribe) {
      await mkdir('./tmp-transcript', { recursive: true });
      const transcriptInputPath = `./tmp-transcript/input-${job.id}.${format.toLowerCase()}`;
      await copyFile(outputPath, transcriptInputPath);

      const inProgress = await sql`
        SELECT 1 FROM note
        WHERE user_id = ${userId}
        AND status IN ('pending', 'reading', 'generating', 'saving')
        UNION ALL
        SELECT 1 FROM note
        WHERE status IN ('pending', 'reading', 'generating', 'saving')
        AND id IN (SELECT note_id FROM note_access WHERE user_id = ${userId})
        UNION ALL
        SELECT 1 FROM exam_prep
        WHERE user_id = ${userId}
        AND status IN ('Pending', 'Reading', 'Generating', 'Saving')
        UNION ALL
        SELECT 1 FROM exam_prep
        WHERE status IN ('Pending', 'Reading', 'Generating', 'Saving')
        AND id IN (SELECT exam_prep_id FROM exam_prep_access WHERE user_id = ${userId})
        UNION ALL
        SELECT 1 FROM transcript
        WHERE user_id = ${userId}
        AND status IN ('Initializing', 'Transcribing')
        LIMIT 1
      `;
      if (inProgress.length > 0) throw new Error('You already have a generation in progress.');

      const counts = await transcriptorQueue.getJobCounts('wait', 'active');
      if (counts.wait + counts.active >= 11) throw new Error('Transcription queue full');

      if (!transcriptionPrice || transcriptionPrice <= 0) throw new Error('Invalid transcription price.');

      const [held] = await sql`UPDATE "user" SET balance = balance - ${transcriptionPrice} WHERE id = ${userId} AND balance >= ${transcriptionPrice} RETURNING id`;
      if (!held) throw new Error('Not enough balance');

      const transcriptJob = await transcriptorQueue.add('transcription', {
        inputPath: transcriptInputPath,
        userId,
        label,
        model,
        vad: 'true',
        fileName,
        outputFormat,
        diarization: 'false',
        transcriptionPrice
      });

      transcriptJobId = transcriptJob.id;
    }

  } finally {
    try { fs.unlinkSync(inputPath); } catch (e) { console.error('Failed to delete inputPath:', e); }
    try { fs.unlinkSync(outputPath); } catch (e) { console.error('Failed to delete outputPath:', e); }
  }

  return { success: true, transcriptJobId };
}, {
  connection,
  concurrency: 1,
});

worker.on('completed', (job) => console.log(`Job ${job.id} done!`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));