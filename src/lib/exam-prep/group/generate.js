import { sql } from "@/lib/storage/db";
import { buildExamPrepPrompt } from "../buildUserPrompt";
import client from "@/lib/openai";

export async function generateExamPrepGroup(examPrepId, publicId, userId, groupId, totalPrice, questionTypes, difficulty) {
    try {
        await sql`UPDATE exam_prep SET status = 'Reading' WHERE id = ${examPrepId}`;

        const sources = await sql`SELECT * FROM exam_prep_sources WHERE exam_prep_id = ${examPrepId}`;

        const noteContents = await Promise.all(
            sources.filter(s => s.source_type === 'note').map(async s => {
                const [note] = await sql`SELECT name, content FROM note WHERE id = ${s.source_note_id}`;
                return note;
            })
        );

        const fileContents = sources
            .filter(s => s.source_type === 'file')
            .map(s => ({ name: s.file_name, content: s.file_content }));

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
            max_tokens: 40000,
            provider: {
                order: ['sambanova'],
                allow_fallbacks: false,
            },
        });

        const choice = response.choices[0];
        if (choice.finish_reason === 'length') {
            throw new Error('Model output was truncated — source material may be too large.');
        }

        await sql`UPDATE exam_prep SET status = 'Saving' WHERE id = ${examPrepId}`;

        const outputText = choice.message.content;
        const usage = response.usage;
        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;

        let parsedContent;
        try {
            const clean = outputText.replace(/```json|```/g, '').trim();
            parsedContent = JSON.parse(clean);
        } catch {
            throw new Error('Model returned invalid JSON.');
        }

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

            await tx`
                UPDATE exam_prep
                SET status = 'Completed',
                    content = ${JSON.stringify(parsedContent)},
                    total_tokens = ${totalTokens},
                    input_tokens = ${inputTokens},
                    output_tokens = ${outputTokens},
                    charge_amount = ${totalPrice}
                WHERE id = ${examPrepId}
            `;

            await tx`DELETE FROM exam_prep_access WHERE exam_prep_id = ${examPrepId}`;

            for (const member of members) {
                const isGenerator = member.user_id === userId;
                const charge = isGenerator ? actualGeneratorCharge : actualSplit;

                const [updated] = await tx`
                    UPDATE "user" SET balance = balance - ${charge}
                    WHERE id = ${member.user_id}
                    RETURNING balance
                `;

                await tx`
                    INSERT INTO exam_prep_access (exam_prep_id, user_id, paid_amount, is_original, unlock_price)
                    VALUES (${examPrepId}, ${member.user_id}, ${charge}, 1, ${unlockPrice})
                `;

                await tx`
                    INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                    VALUES ('exam_prep', ${`Exam Prep · ${difficulty}`}, 'completed', ${member.user_id}, ${examPrepId}, NOW(), ${charge}, ${updated.balance})
                `;
            }
        });

        return { success: true };

    } catch (err) {
        console.error('Group exam prep generation failed:', err);
        await sql`UPDATE exam_prep SET status = 'Failed' WHERE id = ${examPrepId}`;
        throw err;
    }
}