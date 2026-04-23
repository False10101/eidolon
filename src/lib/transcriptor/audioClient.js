import OpenAI from "openai";

function getAudioClient(model) {
    const baseURL = model === 'whisper-v3' 
        ? 'https://audio-prod.api.fireworks.ai/v1'
        : 'https://audio-turbo.api.fireworks.ai/v1';
    
    return new OpenAI({
        apiKey: process.env.FIREWORKS_API_KEY,
        baseURL: baseURL
    });
}

export { getAudioClient };