import OpenAI from "openai";

export const textClient = new OpenAI({
    apiKey: process.env.FIREWORKS_API_KEY,
    baseURL: 'https://api.fireworks.ai/inference/v1'
});

export const audioClient = new OpenAI({
    apiKey: process.env.FIREWORKS_API_KEY,
    baseURL: 'https://audio-prod.api.fireworks.ai/v1'
});