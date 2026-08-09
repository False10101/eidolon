import { sql } from "@/lib/storage/db";
import buildUserPrompt from "../buildUserPrompt";
import { textClient } from "@/lib/openai";
import collectStreamContent from "@/lib/streamCollector";
import { getGroupPerParticipantPrice, getGroupTotalPrice } from "@/lib/groupPricing";
import { getNoteBasePrice, WORST_CASE_NOTE_PRICE } from "@/lib/notePricing";

const ACTIVE_STATUSES = ['pending', 'reading', 'generating', 'saving'];

function hasSameParticipants(participants, expectedParticipantIds) {
    if (participants.length !== expectedParticipantIds.length) return false;

    const actualIds = participants.map((participant) => String(participant.user_id)).sort();
    const expectedIds = expectedParticipantIds.map((participantId) => String(participantId)).sort();
    return actualIds.every((participantId, index) => participantId === expectedIds[index]);
}

async function getParticipantSnapshot(db, noteId, lockRows = false) {
    if (lockRows) {
        return db`
            SELECT note_id, user_id, paid_amount, is_original, unlocked_at
            FROM note_access
            WHERE note_id = ${noteId}
            ORDER BY user_id
            FOR UPDATE
        `;
    }

    return db`
        SELECT note_id, user_id, paid_amount, is_original, unlocked_at
        FROM note_access
        WHERE note_id = ${noteId}
        ORDER BY user_id
    `;
}

async function refundGroupNoteHold(noteId) {
    await sql.begin(async (tx) => {
        const [note] = await tx`
            SELECT id, status
            FROM note
            WHERE id = ${noteId}
            FOR UPDATE
        `;
        if (!note || note.status === 'completed') return;

        const participants = await getParticipantSnapshot(tx, noteId, true);

        for (const participant of participants) {
            const heldAmount = Number(participant.paid_amount ?? 0);
            if (heldAmount > 0) {
                await tx`
                    UPDATE "user"
                    SET balance = balance + ${heldAmount}
                    WHERE id = ${participant.user_id}
                `;
            }
        }

        await tx`DELETE FROM note_access WHERE note_id = ${noteId}`;
        await tx`
            UPDATE note
            SET status = 'failed', charge_amount = 0
            WHERE id = ${noteId}
        `;
    });
}

async function refundGroupNoteRegenerationHold(noteId, expectedParticipantIds) {
    await sql.begin(async (tx) => {
        const [note] = await tx`
            SELECT id, status
            FROM note
            WHERE id = ${noteId}
            FOR UPDATE
        `;
        if (!note || note.status === 'completed') return;

        const participants = await getParticipantSnapshot(tx, noteId, true);
        if (!hasSameParticipants(participants, expectedParticipantIds)) {
            throw new Error('Group note participants changed before the regeneration refund.');
        }

        const heldAmount = getGroupPerParticipantPrice(WORST_CASE_NOTE_PRICE, participants.length);
        for (const participant of participants) {
            await tx`
                UPDATE "user"
                SET balance = balance + ${heldAmount}
                WHERE id = ${participant.user_id}
            `;
        }

        await tx`
            UPDATE note
            SET status = 'completed'
            WHERE id = ${noteId}
        `;
    });
}

export async function generateGroup(noteId, userId, targetLanguage) {
    try {
        const [note] = await sql`
            SELECT *
            FROM note
            WHERE id = ${noteId} AND user_id = ${userId}
        `;
        if (!note || note.generation_type !== 'group') throw new Error('Group note not found.');

        const participants = await getParticipantSnapshot(sql, noteId);
        if (participants.length === 0) throw new Error('Group note has no participants.');

        await sql`
            UPDATE note
            SET status = 'reading'
            WHERE id = ${noteId} AND status = 'pending'
        `;

        let sourceContent = note.source_content;
        if (!sourceContent && note.transcript_id) {
            const [transcript] = await sql`
                SELECT content
                FROM transcript
                WHERE id = ${note.transcript_id}
            `;
            sourceContent = transcript?.content;
        }
        if (!sourceContent) throw new Error('Input content not found.');

        const userPrompt = buildUserPrompt(note.style, sourceContent, targetLanguage);
        await sql`UPDATE note SET status = 'generating' WHERE id = ${noteId}`;

        const stream = await textClient.chat.completions.create({
            model: process.env.NOTE_MODEL,
            messages: [{ role: 'user', content: userPrompt }],
            max_tokens: 40000,
            stream: true
        });

        const { content: output, usage } = await collectStreamContent(stream);
        if (typeof output !== 'string' || !output.trim()) {
            throw new Error('Generation returned empty note content.');
        }
        await sql`UPDATE note SET status = 'saving' WHERE id = ${noteId}`;

        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;
        const participantCount = participants.length;
        const basePrice = getNoteBasePrice(totalTokens);
        const perParticipantPrice = getGroupPerParticipantPrice(basePrice, participantCount);
        const totalCharge = getGroupTotalPrice(basePrice, participantCount);
        const nextUnlockPrice = getGroupPerParticipantPrice(basePrice, participantCount + 1);

        await sql.begin(async (tx) => {
            const [lockedNote] = await tx`
                SELECT id, status, name
                FROM note
                WHERE id = ${noteId}
                FOR UPDATE
            `;
            if (!lockedNote || !ACTIVE_STATUSES.includes(lockedNote.status)) {
                throw new Error('Pending group note changed during generation.');
            }

            const lockedParticipants = await getParticipantSnapshot(tx, noteId, true);
            if (lockedParticipants.length !== participantCount) {
                throw new Error('Group note participants changed during generation.');
            }

            for (const participant of lockedParticipants) {
                const heldAmount = Number(participant.paid_amount);
                if (heldAmount + Number.EPSILON < perParticipantPrice) {
                    throw new Error(`Participant ${participant.user_id} hold is below the final charge.`);
                }

                const refundAmount = Number((heldAmount - perParticipantPrice).toFixed(2));
                const [updatedUser] = await tx`
                    UPDATE "user"
                    SET balance = balance + ${refundAmount}
                    WHERE id = ${participant.user_id}
                    RETURNING balance
                `;
                if (!updatedUser) throw new Error(`Participant ${participant.user_id} no longer exists.`);

                await tx`
                    UPDATE note_access
                    SET paid_amount = ${perParticipantPrice}
                    WHERE note_id = ${noteId} AND user_id = ${participant.user_id}
                `;

                await tx`
                    INSERT INTO activity (
                        type, title, status, user_id, respective_table_id,
                        date, charge_amount, balance_after
                    )
                    VALUES (
                        'note', ${lockedNote.name}, 'completed', ${participant.user_id}, ${noteId},
                        NOW(), ${perParticipantPrice}, ${updatedUser.balance}
                    )
                `;
            }

            await tx`
                UPDATE note
                SET status = 'completed', content = ${output},
                    total_tokens = ${totalTokens}, input_tokens = ${inputTokens},
                    output_tokens = ${outputTokens}, charge_amount = ${totalCharge},
                    unlock_price = ${nextUnlockPrice}
                WHERE id = ${noteId}
            `;
        });

        return { success: true };
    } catch (error) {
        console.error('Group generation failed:', error);
        await refundGroupNoteHold(noteId).catch((refundError) => {
            console.error('CRITICAL: Failed to refund group note hold', refundError);
        });

        throw new Error(error.message ?? 'Group generation failed. Please try again.');
    }
}

export async function regenerateGroup(noteId, targetLanguage, expectedParticipantIds) {
    const participantCount = expectedParticipantIds.length;

    try {
        const [note] = await sql`
            SELECT *
            FROM note
            WHERE id = ${noteId} AND generation_type = 'group'
        `;
        if (!note) throw new Error('Group note not found.');

        const participants = await getParticipantSnapshot(sql, noteId);
        if (participantCount === 0 || !hasSameParticipants(participants, expectedParticipantIds)) {
            throw new Error('Group note participants changed before regeneration started.');
        }

        const [started] = await sql`
            UPDATE note
            SET status = 'reading'
            WHERE id = ${noteId} AND status = 'pending'
            RETURNING id
        `;
        if (!started) throw new Error('Group note is not waiting for regeneration.');

        let sourceContent = note.source_content;
        if (!sourceContent && note.transcript_id) {
            const [transcript] = await sql`
                SELECT content
                FROM transcript
                WHERE id = ${note.transcript_id}
            `;
            sourceContent = transcript?.content;
        }
        if (!sourceContent) throw new Error('Input content not found.');

        const userPrompt = buildUserPrompt(note.style, sourceContent, targetLanguage);
        await sql`UPDATE note SET status = 'generating' WHERE id = ${noteId}`;

        const stream = await textClient.chat.completions.create({
            model: process.env.NOTE_MODEL,
            messages: [{ role: 'user', content: userPrompt }],
            max_tokens: 40000,
            stream: true
        });

        const { content: output, usage } = await collectStreamContent(stream);
        if (typeof output !== 'string' || !output.trim()) {
            throw new Error('Regeneration returned empty note content.');
        }
        await sql`UPDATE note SET status = 'saving' WHERE id = ${noteId}`;

        const totalTokens = usage.total_tokens;
        const inputTokens = usage.prompt_tokens;
        const outputTokens = usage.completion_tokens;
        const basePrice = getNoteBasePrice(totalTokens);
        const perParticipantPrice = getGroupPerParticipantPrice(basePrice, participantCount);
        const totalCharge = getGroupTotalPrice(basePrice, participantCount);
        const nextUnlockPrice = getGroupPerParticipantPrice(basePrice, participantCount + 1);
        const heldAmount = getGroupPerParticipantPrice(WORST_CASE_NOTE_PRICE, participantCount);

        await sql.begin(async (tx) => {
            const [lockedNote] = await tx`
                SELECT id, status, name
                FROM note
                WHERE id = ${noteId}
                FOR UPDATE
            `;
            if (!lockedNote || !ACTIVE_STATUSES.includes(lockedNote.status)) {
                throw new Error('Pending group note changed during regeneration.');
            }

            const lockedParticipants = await getParticipantSnapshot(tx, noteId, true);
            if (!hasSameParticipants(lockedParticipants, expectedParticipantIds)) {
                throw new Error('Group note participants changed during regeneration.');
            }

            for (const participant of lockedParticipants) {
                const refundAmount = Number((heldAmount - perParticipantPrice).toFixed(2));
                const [updatedUser] = await tx`
                    UPDATE "user"
                    SET balance = balance + ${refundAmount}
                    WHERE id = ${participant.user_id}
                    RETURNING balance
                `;
                if (!updatedUser) throw new Error(`Participant ${participant.user_id} no longer exists.`);

                await tx`
                    UPDATE note_access
                    SET paid_amount = ${perParticipantPrice}
                    WHERE note_id = ${noteId} AND user_id = ${participant.user_id}
                `;

                await tx`
                    INSERT INTO activity (
                        type, title, status, user_id, respective_table_id,
                        date, charge_amount, balance_after
                    )
                    VALUES (
                        'note', ${`Regenerated note: ${lockedNote.name}`}, 'completed',
                        ${participant.user_id}, ${noteId}, NOW(),
                        ${perParticipantPrice}, ${updatedUser.balance}
                    )
                `;
            }

            await tx`
                UPDATE note
                SET status = 'completed', content = ${output}, created_at = NOW(),
                    total_tokens = ${totalTokens}, input_tokens = ${inputTokens},
                    output_tokens = ${outputTokens}, charge_amount = ${totalCharge},
                    unlock_price = ${nextUnlockPrice}
                WHERE id = ${noteId}
            `;
        });

        return { success: true };
    } catch (error) {
        console.error('Group regeneration failed:', error);

        if (participantCount > 0) {
            await refundGroupNoteRegenerationHold(noteId, expectedParticipantIds).catch((refundError) => {
                console.error('CRITICAL: Failed to refund group note regeneration hold', refundError);
            });
        }

        throw new Error(error.message ?? 'Group regeneration failed. Please try again.');
    }
}
