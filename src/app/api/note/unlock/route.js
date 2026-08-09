import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { getGroupPerParticipantPrice, getGroupTotalPrice } from "@/lib/groupPricing";
import { getNoteBasePrice } from "@/lib/notePricing";

class RequestError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { publicId } = await req.json();
        if (!publicId) return NextResponse.json({ error: "Missing publicId." }, { status: 400 });

        let nextUnlockPrice;

        await sql.begin(async (tx) => {
            const [note] = await tx`
                SELECT id, name, generation_type, status, user_id, total_tokens, group_id
                FROM note
                WHERE public_id = ${publicId}
                FOR UPDATE
            `;

            if (!note) throw new RequestError('Note not found.', 404);
            if (note.generation_type !== 'group') throw new RequestError('Only group notes can be unlocked.');
            if (note.status !== 'completed') throw new RequestError('Note is not ready yet.');
            if (String(note.user_id) === String(userId)) throw new RequestError('You already own this note.');

            const [membership] = await tx`
                SELECT 1
                FROM group_member
                WHERE group_id = ${note.group_id} AND user_id = ${userId}
            `;
            if (!membership) throw new RequestError('You are not in this note\'s group.', 403);

            const existingAccess = await tx`
                SELECT note_id, user_id, paid_amount, is_original
                FROM note_access
                WHERE note_id = ${note.id}
                ORDER BY user_id
                FOR UPDATE
            `;
            if (existingAccess.length === 0) {
                throw new RequestError('This group note has no participant access records.', 409);
            }
            if (existingAccess.some((access) => String(access.user_id) === String(userId))) {
                throw new RequestError('Already unlocked.');
            }

            const currentCount = existingAccess.length;
            const newCount = currentCount + 1;
            const basePrice = getNoteBasePrice(note.total_tokens);
            const newPerParticipantPrice = getGroupPerParticipantPrice(basePrice, newCount);
            const newTotalCharge = getGroupTotalPrice(basePrice, newCount);
            nextUnlockPrice = getGroupPerParticipantPrice(basePrice, newCount + 1);

            for (const participant of existingAccess) {
                const paidAmount = Number(participant.paid_amount);
                if (paidAmount + Number.EPSILON < newPerParticipantPrice) {
                    throw new RequestError('Existing participant payment data is inconsistent.', 409);
                }
            }

            const [unlockingUser] = await tx`
                UPDATE "user"
                SET balance = balance - ${newPerParticipantPrice}
                WHERE id = ${userId} AND balance >= ${newPerParticipantPrice}
                RETURNING balance
            `;
            if (!unlockingUser) throw new RequestError('Insufficient balance.');

            for (const participant of existingAccess) {
                const paidAmount = Number(participant.paid_amount);
                const refundAmount = Number((paidAmount - newPerParticipantPrice).toFixed(2));

                if (refundAmount > 0) {
                    const [updatedParticipant] = await tx`
                        UPDATE "user"
                        SET balance = balance + ${refundAmount}
                        WHERE id = ${participant.user_id}
                        RETURNING balance
                    `;
                    if (!updatedParticipant) {
                        throw new RequestError(`Participant ${participant.user_id} no longer exists.`, 409);
                    }

                    await tx`
                        INSERT INTO activity (
                            type, title, status, user_id, respective_table_id,
                            date, charge_amount, balance_after
                        )
                        VALUES (
                            'rebate', ${`Group discount rebate: ${note.name}`}, 'completed',
                            ${participant.user_id}, ${note.id}, NOW(), ${-refundAmount},
                            ${updatedParticipant.balance}
                        )
                    `;
                }

                await tx`
                    UPDATE note_access
                    SET paid_amount = ${newPerParticipantPrice}
                    WHERE note_id = ${note.id} AND user_id = ${participant.user_id}
                `;
            }

            await tx`
                INSERT INTO note_access (
                    note_id, user_id, paid_amount, is_original, unlocked_at
                )
                VALUES (${note.id}, ${userId}, ${newPerParticipantPrice}, 0, NOW())
            `;

            await tx`
                INSERT INTO activity (
                    type, title, status, user_id, respective_table_id,
                    date, charge_amount, balance_after
                )
                VALUES (
                    'note', ${`Unlocked note: ${note.name}`}, 'completed',
                    ${userId}, ${note.id}, NOW(), ${newPerParticipantPrice},
                    ${unlockingUser.balance}
                )
            `;

            await tx`
                UPDATE note
                SET charge_amount = ${newTotalCharge}, unlock_price = ${nextUnlockPrice}
                WHERE id = ${note.id}
            `;
        });

        return NextResponse.json({ success: true, nextUnlockPrice });
    } catch (error) {
        console.error('POST /api/note/unlock failed:', error);
        const status = error instanceof RequestError ? error.status : 500;
        const message = error instanceof RequestError ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status });
    }
}
