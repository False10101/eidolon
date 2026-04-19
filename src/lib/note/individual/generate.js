import { sql } from "@/lib/storage/db";
import buildUserPrompt from "../buildUserPrompt";
import client from "@/lib/openai";

export async function generate(noteId, userId, worstCaseCost) {
    try {
        const rows = await sql`SELECT * FROM "note" WHERE id = ${noteId} AND user_id = ${userId}`;
        const note = rows[0];

        if (!note) throw new Error('Note not found.');

        await sql`UPDATE "note" SET status = 'reading' WHERE id = ${noteId}`;

        let sourceContent = note.source_content;

        if (!sourceContent && note.transcript_id) {
            const transcriptRows = await sql`SELECT content FROM "transcript" WHERE id = ${note.transcript_id} AND user_id = ${userId}`;
            sourceContent = transcriptRows[0]?.content;
        }

        if (!sourceContent) throw new Error('Input content not found.');

        const userPrompt = buildUserPrompt(note.style, sourceContent);

        await sql`UPDATE "note" SET status = 'generating' WHERE id = ${noteId}`;

        const response = await client.chat.completions.create({
            model: process.env.NOTE_MODEL,
            messages: [{ role: 'user', content: userPrompt }],
            max_tokens: 40000
        }, {
            headers: { 'X-OpenRouter-Provider': 'fireworks' },
        });

        await sql`UPDATE "note" SET status = 'saving' WHERE id = ${noteId}`;

        const outputText = response.choices[0].message.content;
        const usage = response.usage;
        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;

        let chargeAmount;
        if (totalTokens <= 25000) chargeAmount = 3;
        else if (totalTokens <= 50000) chargeAmount = 6;
        else if (totalTokens <= 75000) chargeAmount = 10;
        else chargeAmount = 13;

        const diff = worstCaseCost - chargeAmount;

        await sql.begin(async (tx) => {
            await tx`
                UPDATE "note" SET status = 'completed', content = ${outputText}, total_tokens = ${totalTokens}, input_tokens = ${inputTokens}, output_tokens = ${outputTokens}, charge_amount = ${chargeAmount}
                WHERE id = ${noteId}
            `;

            const [updated] = await tx`
                UPDATE "user" SET balance = balance + ${diff}
                WHERE id = ${userId}
                RETURNING balance
            `;

            await tx`
                INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                VALUES ('note', ${note.name}, 'completed', ${userId}, ${noteId}, NOW(), ${chargeAmount}, ${updated.balance})
            `;
        });

        return { success: true };
    } catch (error) {
        await sql`UPDATE "note" SET status = 'failed', charge_amount = 0 WHERE id = ${noteId}`;
        await sql`UPDATE "user" SET balance = balance + ${worstCaseCost} WHERE id = ${userId}`;
        console.error('Generation failed:', error);
        throw new Error(error.message ?? 'Generation failed. Please try again.');
    }
}