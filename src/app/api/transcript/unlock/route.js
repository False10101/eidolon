import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { rateLimit } from "@/lib/rateLimit";
import { ceilCredits, getGroupPerParticipantPrice, getGroupTotalPrice } from "@/lib/groupPricing";

const PREMIUM_MODEL = 'openai/whisper-large-v3';
const PREMIUM_PER_MINUTE_RATE = 0.09;
const TURBO_PER_MINUTE_RATE = 0.04;

function getBaseTranscriptionPrice(durationSeconds, model) {
    const rate = model === PREMIUM_MODEL ? PREMIUM_PER_MINUTE_RATE : TURBO_PER_MINUTE_RATE;
    return ceilCredits((Number(durationSeconds) / 60) * rate);
}

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const limited = await rateLimit(`rl:unlock:${userId}`, 15, 60);
        if (limited) return limited;

        const { publicId } = await req.json();
        if (!publicId) return NextResponse.json({ error: 'Missing publicId.' }, { status: 400 });

        const [transcript] = await sql`
            SELECT id, label, user_id, status, duration, model, generation_type, group_id
            FROM transcript WHERE public_id = ${publicId}
        `;

        if (!transcript) return NextResponse.json({ error: 'Transcript not found.' }, { status: 404 });
        if (transcript.status !== 'Completed') return NextResponse.json({ error: 'Transcript is not ready yet.' }, { status: 400 });
        if (transcript.user_id === userId) return NextResponse.json({ error: 'You already own this transcript.' }, { status: 400 });
        if (transcript.generation_type !== 'group') return NextResponse.json({ error: 'Only group transcripts can be unlocked.' }, { status: 400 });

        const [existing] = await sql`
            SELECT transcript_id FROM transcript_access
            WHERE transcript_id = ${transcript.id} AND user_id = ${userId}
        `;
        if (existing) return NextResponse.json({ error: 'Already unlocked.' }, { status: 400 });

        const [membership] = await sql`
            SELECT group_id FROM "group_member"
            WHERE user_id = ${userId} AND group_id = ${transcript.group_id}
            LIMIT 1
        `;
        if (!membership) return NextResponse.json({ error: 'You are not in the same group.' }, { status: 403 });

        await sql.begin(async (tx) => {
            const [lockedTranscript] = await tx`
                SELECT id, label, user_id, status, duration, model, generation_type, group_id
                FROM transcript
                WHERE id = ${transcript.id}
                FOR UPDATE
            `;
            if (!lockedTranscript || lockedTranscript.status !== 'Completed') {
                throw new Error('Transcript is not ready yet.');
            }
            if (lockedTranscript.generation_type !== 'group') {
                throw new Error('Only group transcripts can be unlocked.');
            }

            const [currentMembership] = await tx`
                SELECT 1
                FROM group_member
                WHERE group_id = ${lockedTranscript.group_id} AND user_id = ${userId}
                LIMIT 1
            `;
            if (!currentMembership) throw new Error('You are not in the same group.');

            const existingAccess = await tx`
                SELECT transcript_id, user_id, paid_amount
                FROM transcript_access
                WHERE transcript_id = ${lockedTranscript.id}
                FOR UPDATE
            `;
            if (existingAccess.some((access) => Number(access.user_id) === Number(userId))) {
                throw new Error('Already unlocked.');
            }

            const currentCount = existingAccess.length;
            const newCount = currentCount + 1;
            const basePrice = getBaseTranscriptionPrice(lockedTranscript.duration, lockedTranscript.model);
            const newPerPerson = getGroupPerParticipantPrice(basePrice, newCount);
            const newTotalCharge = getGroupTotalPrice(basePrice, newCount);

            const [updated] = await tx`
                UPDATE "user" SET balance = balance - ${newPerPerson}
                WHERE id = ${userId} AND balance >= ${newPerPerson}
                RETURNING balance
            `;
            if (!updated) throw new Error('Insufficient balance.');

            await tx`
                INSERT INTO transcript_access (transcript_id, user_id, paid_amount, is_original, unlocked_at)
                VALUES (${lockedTranscript.id}, ${userId}, ${newPerPerson}, 0, NOW())
            `;

            await tx`
                INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                VALUES ('transcript', ${`Unlocked transcript: ${lockedTranscript.label}`}, 'completed', ${userId}, ${lockedTranscript.id}, NOW(), ${newPerPerson}, ${updated.balance})
            `;

            // Everyone who already paid is rebated to the same newly reached tier price.
            for (const member of existingAccess) {
                const paid = parseFloat(member.paid_amount);
                const expectedCost = newPerPerson;

                if (paid > expectedCost) {
                    const refund = parseFloat((paid - expectedCost).toFixed(2));
                    
                    const [ownerUpdated] = await tx`
                        UPDATE "user" SET balance = balance + ${refund}
                        WHERE id = ${member.user_id}
                        RETURNING balance
                    `;

                    await tx`
                        UPDATE transcript_access SET paid_amount = ${expectedCost}
                        WHERE transcript_id = ${lockedTranscript.id} AND user_id = ${member.user_id}
                    `;

                    await tx`
                        INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                        VALUES ('rebate', ${`Tier discount refund: ${lockedTranscript.label}`}, 'completed', ${member.user_id}, ${lockedTranscript.id}, NOW(), ${-refund}, ${ownerUpdated.balance})
                    `;
                }
            }

            const nextUnlockPrice = getGroupPerParticipantPrice(basePrice, newCount + 1);
            await tx`
                UPDATE transcript
                SET charge_amount = ${newTotalCharge}, unlock_price = ${nextUnlockPrice}
                WHERE id = ${lockedTranscript.id}
            `;
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        const msg = error.message ?? 'Internal server error';
        const status = [
            'Insufficient balance.',
            'Already unlocked.',
            'Transcript is not ready yet.',
        ].includes(msg) ? 400 : 500;
        if (msg === 'You are not in the same group.') {
            return NextResponse.json({ error: msg }, { status: 403 });
        }
        return NextResponse.json({ error: msg }, { status });
    }
}
