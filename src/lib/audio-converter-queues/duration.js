import { exec } from 'child_process';

function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    exec(ffprobeCmd, (error, stdout) => {
      if (error) reject(error);
      else resolve(Math.round(parseFloat(stdout)));
    });
  });
}

export default getAudioDuration;