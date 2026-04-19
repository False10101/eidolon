import { sql } from "@/lib/storage/db";
import client from "@/lib/openai";
import { buildExamPrepPrompt } from "../buildUserPrompt";

export async function generateExamPrep({
    examPrepId,
    userId,
    noteContents,
    fileContents,
    questionTypes,
    difficulty,
    estimatedCost,
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

        const response = await client.chat.completions.create({
            model: process.env.EXAM_MODEL,
            messages: [{ role: 'user', content: prompt }],
            provider:{
                order: ["sambanova"],
                allow_fallbacks: false
            }
        });

        await sql`UPDATE exam_prep SET status = 'Saving' WHERE id = ${examPrepId}`;

        const outputText = response.choices[0].message.content;
        const usage = response.usage;
        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;

        let chargeAmount;
        if (totalTokens < 25000) chargeAmount = 3;
        else if (totalTokens < 50000) chargeAmount = 6;
        else if (totalTokens < 75000) chargeAmount = 10;
        else chargeAmount = 13;

        const refund = estimatedCost - chargeAmount;

        let parsedContent;
        try {
            const clean = outputText.replace(/```json|```/g, '').trim();
            parsedContent = JSON.parse(clean);
        } catch (err) {
            throw new Error('Model returned invalid JSON.');
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
                VALUES ('exam_prep', ${`Exam Prep · ${difficulty}`}, 'completed', ${userId}, ${examPrepId}, NOW(), ${chargeAmount}, ${updated.balance})
            `;
        });

        return { success: true };

    } catch (err) {
        await sql`UPDATE exam_prep SET status = 'Failed', charge_amount = 0 WHERE id = ${examPrepId}`;
        await sql`UPDATE "user" SET balance = balance + ${estimatedCost} WHERE id = ${userId}`;
        console.error('Exam prep generation failed:', err);
        throw err;
    }
}