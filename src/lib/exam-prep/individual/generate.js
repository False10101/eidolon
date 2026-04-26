import { sql } from "@/lib/storage/db";
import { textClient } from "@/lib/openai";
import { buildExamPrepPrompt } from "../buildUserPrompt";
import { jsonrepair } from 'jsonrepair';

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

    fullContent = fullContent.trim();
    return { content: fullContent, usage };
}

export async function generateExamPrep({
    examPrepId,
    userId,
    noteContents,
    fileContents,
    questionTypes,
    difficulty,
    worstCaseCost,
    label
}) {
    try {
        await sql`UPDATE exam_prep SET status = 'Reading' WHERE id = ${examPrepId}`;

        const lectureContents = [
            ...noteContents.map(n => ({ title: n.name, content: n.content ?? '' })),
            ...fileContents.map(f => ({ title: f.name, content: f.content })),
        ];

        const config = {
            includeTF: questionTypes.includes('tf'),
            includeMCQ: questionTypes.includes('mcq'),
            includeTheory: questionTypes.includes('theory'),
            includeScenario: questionTypes.includes('scenario'),
            includeCalculation: questionTypes.includes('calculation'),
        };

        const prompt = buildExamPrepPrompt(lectureContents, difficulty, config);

        await sql`UPDATE exam_prep SET status = 'Generating' WHERE id = ${examPrepId}`;

        const stream = await textClient.chat.completions.create({
            model: process.env.EXAM_MODEL,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
            max_tokens: 64000,
            temperature: 0.3
        });

        const { content: raw, usage } = await collectStreamContent(stream);

        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;

        let chargeAmount;
        if (totalTokens < 25000) chargeAmount = 9;
        else if (totalTokens < 50000) chargeAmount = 17;
        else if (totalTokens < 75000) chargeAmount = 29;
        else chargeAmount = 37;

        const refund = worstCaseCost - chargeAmount;

        await sql`UPDATE exam_prep SET status = 'Saving' WHERE id = ${examPrepId}`;

        let parsedContent;
        try {
            const repaired = jsonrepair(raw);
            parsedContent = JSON.parse(repaired);
            console.log('✅ JSON parsed');
        } catch (err) {
            console.error('Failed to parse exam prep JSON:', err.message);
            throw new Error(`Could not parse exam prep JSON: ${err.message}`);
        }

        await sql.begin(async (tx) => {
            await tx`
                UPDATE exam_prep
                SET status = 'Completed',
                    content = ${JSON.stringify(parsedContent)},
                    total_tokens = ${totalTokens},
                    input_tokens = ${inputTokens},
                    output_tokens = ${outputTokens},
                    charge_amount = ${chargeAmount}
                WHERE id = ${examPrepId}
            `;

            const [updated] = await tx`
                UPDATE "user" SET balance = balance + ${refund}
                WHERE id = ${userId}
                RETURNING balance
            `;

            await tx`
                INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                VALUES ('exam_prep', ${label}, 'completed', ${userId}, ${examPrepId}, NOW(), ${chargeAmount}, ${updated.balance})
            `;
        });

        return { success: true };

    } catch (err) {
        await sql`UPDATE exam_prep SET status = 'Failed', charge_amount = 0 WHERE id = ${examPrepId}`;
        await sql`UPDATE "user" SET balance = balance + ${worstCaseCost} WHERE id = ${userId}`;
        console.error('Exam prep generation failed:', err);
        throw err;
    }
}