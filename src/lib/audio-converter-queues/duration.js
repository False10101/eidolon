import { execFile } from 'child_process';

function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
      (error, stdout) => {
        if (error) reject(error);
        else resolve(Math.round(parseFloat(stdout)));
      }
    );
  });
}

export default getAudioDuration;