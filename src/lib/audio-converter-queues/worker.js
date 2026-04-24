import { Worker } from "bullmq";
import Ffmpeg from "fluent-ffmpeg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import { mkdir } from 'fs/promises';
import connection from "../redis.js";
import { sql } from "../storage/db.js";

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const timeToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return (hours * 3600) + (minutes * 60) + seconds;
};

const worker = new Worker('audio-conversion', async (job) => {
  const { inputPath, format, bitrate, durationSeconds, userId, start, end } = job.data;
  const outputFileName = `${job.id}.${format.toLowerCase()}`;
  const outputPath = `./tmp-convert/out-${outputFileName}`;

  console.log(`Processing job ${job.id}: ${inputPath}`);

  await mkdir('./tmp-convert', { recursive: true });

  await new Promise((resolve, reject) => {
    let command = Ffmpeg(inputPath)
      .noVideo()  
      .audioCodec('libmp3lame')  
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
        if (p.percent) {
          job.updateProgress(Math.round(p.percent * 0.95));
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
    ContentDisposition: `attachment; filename="${job.data.fileName.split('.')[0]}.${format.toLowerCase()}"`
  }));

  await job.updateProgress(99);

  await sql`INSERT INTO audio_converter_logs (user_id, duration_seconds) VALUES (${userId}, ${durationSeconds})`;

  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);

  return { success: true };
}, {
  connection,
  concurrency: 1,
});

worker.on('completed', (job) => console.log(`Job ${job.id} done!`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));

