export function normalizeParticipantIds(ids, generatorId) {
    const normalized = Array.isArray(ids) ? ids : [];
    const unique = new Set();

    for (const rawId of normalized) {
        const id = Number.parseInt(rawId, 10);
        if (Number.isInteger(id) && id > 0) unique.add(id);
    }

    const parsedGeneratorId = Number.parseInt(generatorId, 10);
    if (Number.isInteger(parsedGeneratorId) && parsedGeneratorId > 0) {
        unique.add(parsedGeneratorId);
    }

    return [...unique];
}

export async function getTranscriptAccessSnapshot(sql, transcriptId, lockRows = false) {
    if (lockRows) {
        return sql`
            SELECT transcript_id, user_id, paid_amount, is_original, unlocked_at
            FROM transcript_access
            WHERE transcript_id = ${transcriptId}
            ORDER BY user_id
            FOR UPDATE
        `;
    }

    return sql`
        SELECT transcript_id, user_id, paid_amount, is_original, unlocked_at
        FROM transcript_access
        WHERE transcript_id = ${transcriptId}
        ORDER BY user_id
    `;
}

export async function refundGroupTranscriptHold(sql, transcriptId) {
    await sql.begin(async (tx) => {
        const [transcript] = await tx`
            SELECT id, status
            FROM transcript
            WHERE id = ${transcriptId}
            FOR UPDATE
        `;
        if (!transcript || transcript.status === 'Completed') return;

        const participants = await getTranscriptAccessSnapshot(tx, transcriptId, true);

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

        await tx`DELETE FROM transcript_access WHERE transcript_id = ${transcriptId}`;
        await tx`UPDATE transcript SET status = 'Failed' WHERE id = ${transcriptId}`;
    });
}
