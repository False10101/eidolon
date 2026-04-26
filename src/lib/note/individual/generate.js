import { sql } from "@/lib/storage/db";
import buildUserPrompt from "../buildUserPrompt";
import { textClient } from "@/lib/openai";
import collectStreamContent from "@/lib/streamCollector";

export async function generate(noteId, userId, worstCaseCost, targetLanguage) {
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

        const userPrompt = buildUserPrompt(note.style, sourceContent, targetLanguage);

        await sql`UPDATE "note" SET status = 'generating' WHERE id = ${noteId}`;

        const stream = await textClient.chat.completions.create({
            model: process.env.NOTE_MODEL,
            messages: [{ role: 'user', content: userPrompt }],
            stream: true,
            max_tokens: 40000
        });

        const { content: output, usage } = await collectStreamContent(stream);

        await sql`UPDATE "note" SET status = 'saving' WHERE id = ${noteId}`;

        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;

        let chargeAmount;
        if (totalTokens <= 25000) chargeAmount = 9;
        else if (totalTokens <= 50000) chargeAmount = 17;
        else if (totalTokens <= 75000) chargeAmount = 29;
        else chargeAmount = 37;

        const diff = worstCaseCost - chargeAmount;

        await sql.begin(async (tx) => {
            await tx`
                UPDATE "note" SET status = 'completed', content = ${output}, total_tokens = ${totalTokens}, input_tokens = ${inputTokens}, output_tokens = ${outputTokens}, charge_amount = ${chargeAmount}
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