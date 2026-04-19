import { sql } from "@/lib/storage/db";
import client from "@/lib/openai";
import buildUserPrompt from "../buildUserPrompt";

export async function generateGroup(noteId, userId, groupId, totalPrice) {
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
        },{
            headers: { 'X-OpenRouter-Provider': 'fireworks' },
        });

        await sql`UPDATE "note" SET status = 'saving' WHERE id = ${noteId}`;

        const outputText = response.choices[0].message.content;
        const usage = response.usage;
        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;

        await sql.begin(async (tx) => {
            await tx`SELECT id FROM "student_group" WHERE id = ${groupId} FOR UPDATE`;
            await tx`SELECT user_id FROM "group_member" WHERE group_id = ${groupId} FOR UPDATE`;

            const members = await tx`
                SELECT user_id FROM "group_member" WHERE group_id = ${groupId}
            `;

            const [group] = await tx`SELECT max_members FROM "student_group" WHERE id = ${groupId}`;
            const unlockPrice = parseFloat((totalPrice / group.max_members).toFixed(2));

            const actualSplit = parseFloat((totalPrice / members.length).toFixed(2));
            const actualGeneratorCharge = parseFloat((actualSplit * 0.5).toFixed(2));
            const contributionPct = parseFloat((1 / members.length).toFixed(4));

            await tx`
                UPDATE "note"
                SET status = 'completed', content = ${outputText},
                    total_tokens = ${totalTokens}, input_tokens = ${inputTokens},
                    output_tokens = ${outputTokens}, charge_amount = ${totalPrice},
                    unlock_price = ${unlockPrice}
                WHERE id = ${noteId}
            `;

            await tx`DELETE FROM "note_access" WHERE note_id = ${noteId}`;

            for (const member of members) {
                const isGenerator = member.user_id === userId;
                const charge = isGenerator ? actualGeneratorCharge : actualSplit;

                const [updated] = await tx`
                    UPDATE "user" SET balance = balance - ${charge}
                    WHERE id = ${member.user_id}
                    RETURNING balance
                `;

                await tx`
                    INSERT INTO "note_access" (note_id, user_id, paid_amount, is_original)
                    VALUES (${noteId}, ${member.user_id}, ${charge}, 1)
                `;

                await tx`
                    INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                    VALUES ('note', ${note.name}, 'completed', ${member.user_id}, ${noteId}, NOW(), ${charge}, ${updated.balance})
                `;
            }
        });

        return { success: true };

    } catch (error) {
        await sql`UPDATE "note" SET status = 'failed' WHERE id = ${noteId}`;
        console.error('Group generation failed:', error);
        throw new Error(error.message ?? 'Group generation failed. Please try again.');
    }
}