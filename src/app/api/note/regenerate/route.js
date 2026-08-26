import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { regenerateIndividual } from "@/lib/note/individual/generate";
import { regenerateGroup } from "@/lib/note/group/generate";
import { getGroupPerParticipantPrice } from "@/lib/groupPricing";
import { WORST_CASE_NOTE_PRICE } from "@/lib/notePricing";
import { rateLimit } from "@/lib/rateLimit";

class RequestError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function sameUser(left, right) {
    return String(left) === String(right);
}

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const limited = await rateLimit(`rl:note-gen:${userId}`, 10, 60);
        if (limited) return limited;

        const inProgress = await sql`
            SELECT 1 FROM note
            WHERE user_id = ${userId}
            AND status IN ('pending', 'reading', 'generating', 'saving')
            UNION ALL
            SELECT 1 FROM note
            WHERE status IN ('pending', 'reading', 'generating', 'saving')
            AND id IN (SELECT note_id FROM note_access WHERE user_id = ${userId})
            UNION ALL
            SELECT 1 FROM exam_prep
            WHERE user_id = ${userId}
            AND status IN ('Pending', 'Reading', 'Generating', 'Saving')
            UNION ALL
            SELECT 1 FROM exam_prep
            WHERE status IN ('Pending', 'Reading', 'Generating', 'Saving')
            AND id IN (SELECT exam_prep_id FROM exam_prep_access WHERE user_id = ${userId})
            UNION ALL
            SELECT 1 FROM transcript
            WHERE user_id = ${userId}
            AND status IN ('Initializing', 'Transcribing')
            LIMIT 1
        `;
        if (inProgress.length > 0) {
            throw new RequestError('You already have a generation in progress. Please wait for it to complete.');
        }

        const { publicId } = await req.json();
        if (!publicId) throw new RequestError('Missing publicId.');

        const [note] = await sql`
            SELECT n.*, sg.owner_id AS group_owner_id
            FROM note n
            LEFT JOIN student_group sg ON sg.id = n.group_id
            WHERE n.public_id = ${publicId}
        `;
        if (!note) throw new RequestError('Note not found.', 404);
        if (note.is_trial) {
            throw new RequestError('You must unlock this free preview before regenerating it.');
        }

        const isGenerator = sameUser(note.user_id, userId);

        let sourceContent = note.source_content;
        if (!sourceContent && note.transcript_id) {
            const [transcript] = await sql`
                SELECT content
                FROM transcript
                WHERE id = ${note.transcript_id}
            `;
            sourceContent = transcript?.content;
        }
        if (!sourceContent) throw new RequestError('No source content to regenerate from.');

        const estimatedInputTokens = Math.ceil(sourceContent.length / 4);
        if (estimatedInputTokens > 65000) {
            throw new RequestError('Transcript is too long. Maximum input is ~65,000 tokens.');
        }

        if (note.generation_type === 'group') {
            const isGroupOwner = sameUser(note.group_owner_id, userId);
            if (!isGenerator && !isGroupOwner) {
                throw new RequestError('Only the group owner or note generator can regenerate this note.', 403);
            }

            let participantIds = [];

            await sql.begin(async (tx) => {
                const [lockedNote] = await tx`
                    SELECT id, status, generation_type
                    FROM note
                    WHERE id = ${note.id}
                    FOR UPDATE
                `;
                if (!lockedNote || lockedNote.generation_type !== 'group') {
                    throw new RequestError('Group note not found.', 404);
                }
                if (lockedNote.status !== 'completed') {
                    throw new RequestError('This note is not ready to regenerate.');
                }

                const participants = await tx`
                    SELECT na.user_id, u.balance
                    FROM note_access na
                    JOIN "user" u ON u.id = na.user_id
                    WHERE na.note_id = ${note.id}
                    ORDER BY na.user_id
                    FOR UPDATE OF na
                `;
                const participantCount = participants.length;
                if (participantCount === 0) {
                    throw new RequestError('This group note has no participants.', 409);
                }
                participantIds = participants.map((participant) => participant.user_id);

                const holdPerParticipant = getGroupPerParticipantPrice(
                    WORST_CASE_NOTE_PRICE,
                    participantCount
                );
                const broke = participants.find(
                    (participant) => Number(participant.balance) < holdPerParticipant
                );
                if (broke) {
                    throw new RequestError('A note participant has insufficient balance to authorize regeneration.');
                }

                for (const participant of participants) {
                    const [held] = await tx`
                        UPDATE "user"
                        SET balance = balance - ${holdPerParticipant}
                        WHERE id = ${participant.user_id} AND balance >= ${holdPerParticipant}
                        RETURNING id
                    `;
                    if (!held) {
                        throw new RequestError(`Participant ${participant.user_id} has insufficient balance.`);
                    }
                }

                await tx`
                    UPDATE note
                    SET status = 'pending'
                    WHERE id = ${note.id}
                `;
            });

            regenerateGroup(note.id, note.language, participantIds)
                .catch((error) => console.error('Group regen error:', error));

            return NextResponse.json({ publicId, estimatedInputTokens });
        }

        if (!isGenerator) throw new RequestError('Note not found.', 404);
        if (note.status !== 'completed') throw new RequestError('This note is not ready to regenerate.');

        const [user] = await sql`SELECT balance FROM "user" WHERE id = ${userId}`;
        if (!user || Number(user.balance) < WORST_CASE_NOTE_PRICE) {
            throw new RequestError(
                `Insufficient balance. This generation may cost up to ${WORST_CASE_NOTE_PRICE} credits. Your balance is ${user?.balance ?? 0} credits.`
            );
        }

        await sql.begin(async (tx) => {
            const [lockedNote] = await tx`
                SELECT id, status, generation_type
                FROM note
                WHERE id = ${note.id} AND user_id = ${userId}
                FOR UPDATE
            `;
            if (!lockedNote || lockedNote.generation_type === 'group') {
                throw new RequestError('Note not found.', 404);
            }
            if (lockedNote.status !== 'completed') {
                throw new RequestError('This note is not ready to regenerate.');
            }

            const [held] = await tx`
                UPDATE "user"
                SET balance = balance - ${WORST_CASE_NOTE_PRICE}
                WHERE id = ${userId} AND balance >= ${WORST_CASE_NOTE_PRICE}
                RETURNING id
            `;
            if (!held) throw new RequestError('Insufficient balance.');

            await tx`
                UPDATE note
                SET status = 'pending'
                WHERE id = ${note.id}
            `;
        });

        regenerateIndividual(note.id, userId, note.language)
            .catch((error) => console.error('Regen error:', error));

        return NextResponse.json({ publicId, estimatedInputTokens });
    } catch (error) {
        console.error('POST /api/note/regenerate failed:', error);
        const status = error instanceof RequestError ? error.status : 500;
        const message = error instanceof RequestError ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status });
    }
}
