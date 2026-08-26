import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { v4 as uuidv4 } from "uuid";
import { generate } from "@/lib/note/individual/generate";
import { franc } from "franc-min";
import languageMap from "@/lib/languageMap";
import { rateLimit } from "@/lib/rateLimit";
import { resolveCategorization } from "@/lib/categories";
import { WORST_CASE_NOTE_PRICE } from "@/lib/notePricing";

class RequestError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const ACTIVE_NOTE_STATUSES = ['pending', 'reading', 'generating', 'saving', 'completed'];

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

        const formData = await req.formData();
        const file = formData.get('file') || null;
        const transcriptPublicId = formData.get('transcript_id') || null;

        if (file === null && transcriptPublicId === null) {
            throw new RequestError('Please upload/select a transcript file!');
        }
        if (file !== null && transcriptPublicId !== null) {
            throw new RequestError('Please upload/select only one file!');
        }

        const name = formData.get('name');
        let language = formData.get('target_language') || null;
        const style = formData.get('style') || 'standard';
        const requestedCategorizationId = formData.get('categorization_id') || null;
        const categorizationId = await resolveCategorization(userId, requestedCategorizationId);
        if (requestedCategorizationId && !categorizationId) {
            throw new RequestError('Invalid category.');
        }

        const publicId = uuidv4();
        let sourceContent = null;
        let uploadedFilename = null;
        let transcriptDbId = null;

        if (transcriptPublicId) {
            const [transcript] = await sql`
                SELECT id, content
                FROM transcript
                WHERE public_id = ${transcriptPublicId}
                  AND user_id = ${userId}
                  AND status = 'Completed'
            `;
            if (!transcript) throw new RequestError('Transcript not found.', 404);
            transcriptDbId = transcript.id;
            sourceContent = transcript.content;
        } else {
            if (file.size > 10 * 1024 * 1024) {
                throw new RequestError('File is too large. Maximum size is 10MB.');
            }
            sourceContent = await file.text();
            uploadedFilename = file.name;
        }

        if (typeof sourceContent !== 'string' || !sourceContent.trim()) {
            throw new RequestError('Input content is empty.');
        }

        const estimatedInputTokens = Math.ceil(sourceContent.length / 4);
        if (estimatedInputTokens > 65000) {
            throw new RequestError('Transcript is too long. Maximum input is ~65,000 tokens.');
        }

        if (language === null || language === 'auto') {
            const detectedCode = franc(sourceContent.slice(0, 500));
            language = languageMap[detectedCode] || 'English';
        }

        let noteId;
        let isTrial = false;
        let trialSlotConsumed = false;

        await sql.begin(async (tx) => {
            const [user] = await tx`
                SELECT balance, free_generations_remaining
                FROM "user"
                WHERE id = ${userId}
                FOR UPDATE
            `;
            if (!user) throw new RequestError('User not found.', 404);

            if (transcriptDbId) {
                const [sourceTranscript] = await tx`
                    SELECT id, is_trial
                    FROM transcript
                    WHERE id = ${transcriptDbId} AND user_id = ${userId}
                    FOR UPDATE
                `;
                if (!sourceTranscript) throw new RequestError('Transcript not found.', 404);

                if (sourceTranscript.is_trial) {
                    const [existingCompanion] = await tx`
                        SELECT 1
                        FROM note
                        WHERE transcript_id = ${transcriptDbId}
                          AND status = ANY(${ACTIVE_NOTE_STATUSES}::varchar[])
                        LIMIT 1
                    `;
                    if (!existingCompanion) isTrial = true;
                }
            }

            if (!isTrial && Number(user.free_generations_remaining ?? 0) > 0) {
                const [heldTrial] = await tx`
                    UPDATE "user"
                    SET free_generations_remaining = free_generations_remaining - 1
                    WHERE id = ${userId} AND free_generations_remaining > 0
                    RETURNING id
                `;
                if (!heldTrial) throw new RequestError('Trial credit is no longer available.');
                isTrial = true;
                trialSlotConsumed = true;
            } else if (!isTrial) {
                const [heldBalance] = await tx`
                    UPDATE "user"
                    SET balance = balance - ${WORST_CASE_NOTE_PRICE}
                    WHERE id = ${userId} AND balance >= ${WORST_CASE_NOTE_PRICE}
                    RETURNING id
                `;
                if (!heldBalance) {
                    throw new RequestError(
                        `Insufficient balance. This generation may cost up to ${WORST_CASE_NOTE_PRICE} credits. Your balance is ${user.balance} credits.`
                    );
                }
            }

            const [createdNote] = await tx`
                INSERT INTO note (
                    name, created_at, user_id, status, public_id, style, transcript_id,
                    uploaded_filename, source_content, generation_type, language, is_trial,
                    categorization_id
                )
                VALUES (
                    ${name}, NOW(), ${userId}, 'pending', ${publicId}, ${style}, ${transcriptDbId},
                    ${uploadedFilename}, ${sourceContent}, 'individual', ${language}, ${isTrial},
                    ${categorizationId}
                )
                RETURNING id
            `;
            noteId = createdNote.id;
        });

        generate(
            noteId,
            userId,
            WORST_CASE_NOTE_PRICE,
            language,
            trialSlotConsumed
        ).catch((error) => console.error('Generation error:', error));

        return NextResponse.json({ publicId, isTrial, estimatedInputTokens });
    } catch (error) {
        console.error('POST /api/note/generate/individual failed:', error);
        const status = error instanceof RequestError ? error.status : 500;
        const message = error instanceof RequestError ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status });
    }
}
