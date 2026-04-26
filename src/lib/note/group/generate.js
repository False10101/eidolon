import { sql } from "@/lib/storage/db";
import buildUserPrompt from "../buildUserPrompt";
import { textClient } from "@/lib/openai";
import collectStreamContent from "@/lib/streamCollector";
import { getGroupTierPrice } from "@/app/api/note/generate/group/route";

export async function generateGroup(noteId, userId, groupId, groupTier, maxPriceHold, targetLanguage) {
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
            max_tokens: 40000,
            stream: true
        });

        const {content: output, usage} = await collectStreamContent(stream);
        await sql`UPDATE "note" SET status = 'saving' WHERE id = ${noteId}`;

        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;

        // 1. Calculate actual final price based on actual tokens
        const finalPrice = getGroupTierPrice(totalTokens, groupTier);

        await sql.begin(async (tx) => {
            await tx`SELECT id FROM "student_group" WHERE id = ${groupId} FOR UPDATE`;
            await tx`SELECT user_id FROM "group_member" WHERE group_id = ${groupId} FOR UPDATE`;

            const members = await tx`SELECT user_id FROM "group_member" WHERE group_id = ${groupId}`;
            const [group] = await tx`SELECT max_members FROM "student_group" WHERE id = ${groupId}`;
            
            const unlockPrice = parseFloat((finalPrice / group.max_members).toFixed(2));

            // What they paid upfront
            const maxSplit = parseFloat((maxPriceHold / members.length).toFixed(2));
            const maxGeneratorCharge = parseFloat((maxSplit * 0.5).toFixed(2));

            // What they actually owe
            const finalSplit = parseFloat((finalPrice / members.length).toFixed(2));
            const finalGeneratorCharge = parseFloat((finalSplit * 0.5).toFixed(2));

            await tx`
                UPDATE "note"
                SET status = 'completed', content = ${output},
                    total_tokens = ${totalTokens}, input_tokens = ${inputTokens},
                    output_tokens = ${outputTokens}, charge_amount = ${finalPrice},
                    unlock_price = ${unlockPrice}
                WHERE id = ${noteId}
            `;

            await tx`DELETE FROM "note_access" WHERE note_id = ${noteId}`;

            // 2. Refund the difference between what was held and what they owe
            for (const member of members) {
                const isGenerator = member.user_id === userId;
                
                const holdCharge = isGenerator ? maxGeneratorCharge : maxSplit;
                const actualCharge = isGenerator ? finalGeneratorCharge : finalSplit;
                const refundAmount = parseFloat((holdCharge - actualCharge).toFixed(2));

                // Refund the difference back to their balance
                const [updated] = await tx`
                    UPDATE "user" SET balance = balance + ${refundAmount}
                    WHERE id = ${member.user_id}
                    RETURNING balance
                `;

                await tx`
                    INSERT INTO "note_access" (note_id, user_id, paid_amount, is_original)
                    VALUES (${noteId}, ${member.user_id}, ${actualCharge}, 1)
                `;

                await tx`
                    INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                    VALUES ('note', ${note.name}, 'completed', ${member.user_id}, ${noteId}, NOW(), ${actualCharge}, ${updated.balance})
                `;
            }
        });

        return { success: true };

    } catch (error) {
        console.error('Group generation failed:', error);
        
        // 3. FAILSAFE: Refund the entire hold amount if generation crashes
        await sql.begin(async (tx) => {
            const members = await tx`SELECT user_id FROM "group_member" WHERE group_id = ${groupId}`;
            const maxSplit = parseFloat((maxPriceHold / members.length).toFixed(2));
            const maxGeneratorCharge = parseFloat((maxSplit * 0.5).toFixed(2));

            for (const member of members) {
                const holdCharge = member.user_id === userId ? maxGeneratorCharge : maxSplit;
                await tx`UPDATE "user" SET balance = balance + ${holdCharge} WHERE id = ${member.user_id}`;
            }
            await tx`UPDATE "note" SET status = 'failed' WHERE id = ${noteId}`;
        }).catch(e => console.error("CRITICAL: Failed to process refund during worker error block", e));

        throw new Error(error.message ?? 'Group generation failed. Please try again.');
    }
}