import { sql } from "@/lib/storage/db";
import buildUserPrompt from "../buildUserPrompt";
import { textClient } from "@/lib/openai";
import collectStreamContent from "@/lib/streamCollector";
import { getNoteBasePrice, WORST_CASE_NOTE_PRICE } from "@/lib/notePricing";

const ACTIVE_STATUSES = ['pending', 'reading', 'generating', 'saving'];

async function refundIndividualRegenerationHold(noteId, userId) {
    await sql.begin(async (tx) => {
        const [note] = await tx`
            SELECT id, status
            FROM note
            WHERE id = ${noteId} AND user_id = ${userId}
            FOR UPDATE
        `;
        if (!note || note.status === 'completed') return;

        await tx`
            UPDATE "user"
            SET balance = balance + ${WORST_CASE_NOTE_PRICE}
            WHERE id = ${userId}
        `;
        await tx`
            UPDATE note
            SET status = 'completed'
            WHERE id = ${noteId}
        `;
    });
}

export async function generate(noteId, userId, worstCaseCost, targetLanguage, trialSlotConsumed = false) {
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

            if (!note.is_trial) {
                const [updated] = await tx`
                    UPDATE "user" SET balance = balance + ${diff}
                    WHERE id = ${userId}
                    RETURNING balance
                `;

                await tx`
                    INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                    VALUES ('note', ${note.name}, 'completed', ${userId}, ${noteId}, NOW(), ${chargeAmount}, ${updated.balance})
                `;
            }
        });

        return { success: true };
    } catch (error) {
        await sql`UPDATE "note" SET status = 'failed', charge_amount = 0 WHERE id = ${noteId}`;
        const checkRows = await sql`SELECT is_trial FROM "note" WHERE id = ${noteId}`;
        const isTrial = checkRows[0]?.is_trial;
        if (!isTrial) {
            await sql`UPDATE "user" SET balance = balance + ${worstCaseCost} WHERE id = ${userId}`;
        } else if (trialSlotConsumed) {
            await sql`
                UPDATE "user"
                SET free_generations_remaining = free_generations_remaining + 1
                WHERE id = ${userId}
            `;
        }
        console.error('Generation failed:', error);
        throw new Error(error.message ?? 'Generation failed. Please try again.');
    }
}

export async function regenerateIndividual(noteId, userId, targetLanguage) {
    try {
        const [note] = await sql`
            SELECT *
            FROM note
            WHERE id = ${noteId} AND user_id = ${userId}
        `;
        if (!note || note.generation_type === 'group') throw new Error('Individual note not found.');

        const [started] = await sql`
            UPDATE note
            SET status = 'reading'
            WHERE id = ${noteId} AND status = 'pending'
            RETURNING id
        `;
        if (!started) throw new Error('Individual note is not waiting for regeneration.');

        let sourceContent = note.source_content;
        if (!sourceContent && note.transcript_id) {
            const [transcript] = await sql`
                SELECT content
                FROM transcript
                WHERE id = ${note.transcript_id} AND user_id = ${userId}
            `;
            sourceContent = transcript?.content;
        }
        if (!sourceContent) throw new Error('Input content not found.');

        const userPrompt = buildUserPrompt(note.style, sourceContent, targetLanguage);
        await sql`UPDATE note SET status = 'generating' WHERE id = ${noteId}`;

        const stream = await textClient.chat.completions.create({
            model: process.env.NOTE_MODEL,
            messages: [{ role: 'user', content: userPrompt }],
            stream: true,
            max_tokens: 40000
        });

        const { content: output, usage } = await collectStreamContent(stream);
        if (typeof output !== 'string' || !output.trim()) {
            throw new Error('Regeneration returned empty note content.');
        }

        await sql`UPDATE note SET status = 'saving' WHERE id = ${noteId}`;

        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;
        const chargeAmount = getNoteBasePrice(totalTokens);
        const refundAmount = WORST_CASE_NOTE_PRICE - chargeAmount;

        await sql.begin(async (tx) => {
            const [lockedNote] = await tx`
                SELECT id, status, name
                FROM note
                WHERE id = ${noteId} AND user_id = ${userId}
                FOR UPDATE
            `;
            if (!lockedNote || !ACTIVE_STATUSES.includes(lockedNote.status)) {
                throw new Error('Pending individual note changed during regeneration.');
            }

            const [updatedUser] = await tx`
                UPDATE "user"
                SET balance = balance + ${refundAmount}
                WHERE id = ${userId}
                RETURNING balance
            `;
            if (!updatedUser) throw new Error('User no longer exists.');

            await tx`
                INSERT INTO activity (
                    type, title, status, user_id, respective_table_id,
                    date, charge_amount, balance_after
                )
                VALUES (
                    'note', ${`Regenerated note: ${lockedNote.name}`}, 'completed',
                    ${userId}, ${noteId}, NOW(), ${chargeAmount}, ${updatedUser.balance}
                )
            `;

            await tx`
                UPDATE note
                SET status = 'completed', content = ${output}, created_at = NOW(),
                    total_tokens = ${totalTokens}, input_tokens = ${inputTokens},
                    output_tokens = ${outputTokens}, charge_amount = ${chargeAmount}
                WHERE id = ${noteId}
            `;
        });

        return { success: true };
    } catch (error) {
        console.error('Individual regeneration failed:', error);
        await refundIndividualRegenerationHold(noteId, userId).catch((refundError) => {
            console.error('CRITICAL: Failed to refund individual note regeneration hold', refundError);
        });

        throw new Error(error.message ?? 'Individual regeneration failed. Please try again.');
    }
}
