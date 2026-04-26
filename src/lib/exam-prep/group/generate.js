import { sql } from "@/lib/storage/db";
import { buildExamPrepPrompt } from "../buildUserPrompt";
import {textClient} from "@/lib/openai";
import { jsonrepair } from 'jsonrepair';
import { getGroupTierPrice } from "@/app/api/note/generate/group/route";

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

export async function generateExamPrepGroup(examPrepId, publicId, userId, groupId, groupTier, maxPriceHold, questionTypes, difficulty, label) {
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

        let parsedContent;
        try {
            const repaired = jsonrepair(raw);
            parsedContent = JSON.parse(repaired);
            console.log('✅ JSON parsed');
        } catch (err) {
            console.error('Failed to parse exam prep JSON:', err.message);
            throw new Error(`Could not parse exam prep JSON: ${err.message}`);
        }

        await sql`UPDATE exam_prep SET status = 'Saving' WHERE id = ${examPrepId}`;

        const finalPrice = getGroupTierPrice(totalTokens, groupTier);

        await sql.begin(async (tx) => {
            await tx`SELECT id FROM "student_group" WHERE id = ${groupId} FOR UPDATE`;
            await tx`SELECT user_id FROM "group_member" WHERE group_id = ${groupId} FOR UPDATE`;

            const members = await tx`SELECT user_id FROM "group_member" WHERE group_id = ${groupId}`;
            const [group] = await tx`SELECT max_members FROM "student_group" WHERE id = ${groupId}`;
            
            const unlockPrice = parseFloat((finalPrice / group.max_members).toFixed(2));

            const maxSplit = parseFloat((maxPriceHold / members.length).toFixed(2));
            const maxGeneratorCharge = parseFloat((maxSplit * 0.5).toFixed(2));

            const finalSplit = parseFloat((finalPrice / members.length).toFixed(2));
            const finalGeneratorCharge = parseFloat((finalSplit * 0.5).toFixed(2));

            await tx`
                UPDATE exam_prep
                SET status = 'Completed',
                    content = ${JSON.stringify(parsedContent)},
                    total_tokens = ${totalTokens},
                    input_tokens = ${inputTokens},
                    output_tokens = ${outputTokens},
                    charge_amount = ${finalPrice}
                WHERE id = ${examPrepId}
            `;

            await tx`DELETE FROM exam_prep_access WHERE exam_prep_id = ${examPrepId}`;

            for (const member of members) {
                const isGenerator = member.user_id === userId;
                
                const holdCharge = isGenerator ? maxGeneratorCharge : maxSplit;
                const actualCharge = isGenerator ? finalGeneratorCharge : finalSplit;
                const refundAmount = parseFloat((holdCharge - actualCharge).toFixed(2));

                const [updated] = await tx`
                    UPDATE "user" SET balance = balance + ${refundAmount}
                    WHERE id = ${member.user_id}
                    RETURNING balance
                `;

                await tx`
                    INSERT INTO exam_prep_access (exam_prep_id, user_id, paid_amount, is_original, unlock_price)
                    VALUES (${examPrepId}, ${member.user_id}, ${actualCharge}, 1, ${unlockPrice})
                `;

                await tx`
                    INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                    VALUES ('exam_prep', ${label}, 'completed', ${member.user_id}, ${examPrepId}, NOW(), ${actualCharge}, ${updated.balance})
                `;
            }
        });

        return { success: true };

    } catch (err) {
        console.error('Group exam prep generation failed:', err);
        
        await sql.begin(async (tx) => {
            const members = await tx`SELECT user_id FROM "group_member" WHERE group_id = ${groupId}`;
            const maxSplit = parseFloat((maxPriceHold / members.length).toFixed(2));
            const maxGeneratorCharge = parseFloat((maxSplit * 0.5).toFixed(2));

            for (const member of members) {
                const holdCharge = member.user_id === userId ? maxGeneratorCharge : maxSplit;
                await tx`UPDATE "user" SET balance = balance + ${holdCharge} WHERE id = ${member.user_id}`;
            }
            await tx`UPDATE exam_prep SET status = 'Failed' WHERE id = ${examPrepId}`;
        }).catch(e => console.error("CRITICAL: Failed to process refund during worker error block", e));

        throw err;
    }
}