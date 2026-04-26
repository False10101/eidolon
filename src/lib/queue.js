import { Queue } from "bullmq";
import connection from "./redis.js";

export const audioQueue = new Queue('audio-conversion', {connection});
export const transcriptorQueue = new Queue('transcription', {connection});
