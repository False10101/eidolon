import fs, {mkdirSync} from 'fs'
import getAudioDuration from '../audio-converter-queues/duration.js';
import path from 'path';
import { exec } from 'child_process';

async function splitAudioChunks(inputPath, maxFileSize, tempDir) {
    const fileSize = fs.statSync(inputPath).size;

    if (fileSize <= maxFileSize) {
        return [inputPath];
    }

    const chunkDuration = await getAudioDuration(inputPath);
    const chunkCount = Math.ceil(fileSize / maxFileSize);
    const chunkLength = Math.ceil(chunkDuration / chunkCount);
    const chunkPaths = [];

    mkdirSync(tempDir, { recursive: true });

    for (let i = 0; i < chunkCount; i++) {
        const ext = path.extname(inputPath).toLowerCase() || ".mp3";
        const chunkPath = path.join(tempDir, `chunk${i}${ext}`);
        chunkPaths.push(chunkPath);

        const startTime = i * chunkLength;
        const ffmpegCMD = `ffmpeg -ss ${startTime} -i "${inputPath}" -t ${chunkLength} -c copy "${chunkPath}" -y -loglevel error`;

        await new Promise((resolve, reject) => {
            exec(ffmpegCMD, (error) => {
                if (error) reject(error);
                else resolve();
            })
        })
        console.log(`Created chunk ${i + 1}/${chunkCount}`);
    }
    return chunkPaths;
}

export default splitAudioChunks;