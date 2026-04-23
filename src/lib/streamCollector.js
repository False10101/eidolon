async function collectStreamContent(stream) {
    let fullContent = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
        
        if (chunk.usage) {
            usage = chunk.usage;
        }
    }
    
    return { content: fullContent, usage };
}

export default collectStreamContent;