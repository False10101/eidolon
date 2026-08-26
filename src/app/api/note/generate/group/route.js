import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { v4 as uuidv4 } from "uuid";
import { generateGroup } from "@/lib/note/group/generate";
import { franc } from "franc-min";
import languageMap from "@/lib/languageMap";
import { rateLimit } from "@/lib/rateLimit";
import { resolveCategorization } from "@/lib/categories";
import { normalizeParticipantIds } from "@/lib/groupGeneration";
import { getGroupPerParticipantPrice, getGroupTotalPrice } from "@/lib/groupPricing";
import { WORST_CASE_NOTE_PRICE } from "@/lib/notePricing";

// Exported so the worker can calculate the final price
export function getGroupTierPrice(totalTokens, groupTier) {
    const PRICES = {
        small: [37, 74, 120, 160],
        study: [65, 130, 215, 280],
        class: [130, 255, 430, 555],
        faculty: [170, 345, 570, 745],
    };
    const tiers = PRICES[groupTier];
    if (totalTokens <= 25000) return tiers[0];
    if (totalTokens <= 50000) return tiers[1];
    if (totalTokens <= 75000) return tiers[2];
    return tiers[3]; // The max tier
}

export async function POST(req) {
    const userId = await verifyUserData(req);
    if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limited = await rateLimit(`rl:note-gen:${userId}`, 10, 60);
    if (limited) return limited;

    const inProgress = await sql`
        SELECT 1 FROM note WHERE user_id = ${userId} AND status IN ('pending', 'reading', 'generating', 'saving')
        UNION ALL
        SELECT 1 FROM note WHERE status IN ('pending', 'reading', 'generating', 'saving') AND id IN (SELECT note_id FROM note_access WHERE user_id = ${userId})
        UNION ALL
        SELECT 1 FROM exam_prep WHERE user_id = ${userId} AND status IN ('Pending', 'Reading', 'Generating', 'Saving')
        UNION ALL
        SELECT 1 FROM exam_prep WHERE status IN ('Pending', 'Reading', 'Generating', 'Saving') AND id IN (SELECT exam_prep_id FROM exam_prep_access WHERE user_id = ${userId})
        UNION ALL
        SELECT 1 FROM transcript WHERE user_id = ${userId} AND status IN ('Initializing', 'Transcribing')
        LIMIT 1
    `;
    if (inProgress.length > 0) return NextResponse.json({ error: 'You already have a generation in progress. Please wait.' }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get('file') || null;
    const transcript_id = formData.get('transcript_id') || null;
    let selectedMemberIds = [];

    try {
        selectedMemberIds = JSON.parse(formData.get('member_ids') || '[]');
    } catch {
        return NextResponse.json({ error: "Invalid participant selection." }, { status: 400 });
    }
    selectedMemberIds = normalizeParticipantIds(selectedMemberIds, userId);

    if (selectedMemberIds.length === 0) {
        return NextResponse.json({ error: "Please select at least one participant." }, { status: 400 });
    }

    const [membership] = await sql`
        SELECT group_id
        FROM "group_member"
        WHERE user_id = ${userId}
        LIMIT 1
    `;
    if (!membership) return NextResponse.json({ error: "You are not in a group." }, { status: 400 });

    if (file === null && transcript_id === null) return NextResponse.json({ error: "Please upload/select a transcript file!" }, { status: 400 });
    if (file !== null && transcript_id !== null) return NextResponse.json({ error: "Please upload/select only one file!" }, { status: 400 });

    const name = formData.get('name');
    let language = formData.get('target_language') || null;
    const style = formData.get('style') || 'standard';
    const requestedCategorizationId = formData.get('categorization_id') || null;
    const categorizationId = await resolveCategorization(userId, requestedCategorizationId);
    if (requestedCategorizationId && !categorizationId) {
        return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
    }
    const publicId = uuidv4();

    let sourceContent = null;
    let uploadedFilename = null;
    let transcriptDbId = null;

    if (transcript_id) {
        const rows = await sql`
            SELECT t.id, t.content
            FROM "transcript" t
            WHERE t.public_id = ${transcript_id}
            AND t.status = 'Completed'
            AND (
                t.user_id = ${userId}
                OR EXISTS (
                    SELECT 1
                    FROM transcript_access ta
                    WHERE ta.transcript_id = t.id AND ta.user_id = ${userId}
                )
            )
        `;
        if (!rows[0]) return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
        transcriptDbId = rows[0].id;
        sourceContent = rows[0].content;
    } else {
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'File is too large. Maximum size is 10MB.' }, { status: 400 });
        }
        sourceContent = await file.text();
        uploadedFilename = file.name;
    }

    const estimatedInputTokens = Math.ceil(sourceContent.length / 4);

    if (language === null || language === 'auto') {
        const sampleText = sourceContent.slice(0, 500);
        const detectedCode = franc(sampleText);
        language = languageMap[detectedCode] || 'English';
    }

    if (estimatedInputTokens > 65000) return NextResponse.json({ error: "Transcript is too long. Maximum input is ~65,000 tokens." }, { status: 400 });

    const members = await sql`
        SELECT gm.user_id, u.balance
        FROM "group_member" gm
        JOIN "user" u ON u.id = gm.user_id
        WHERE gm.group_id = ${membership.group_id}
        AND gm.user_id = ANY(${selectedMemberIds}::bigint[])
    `;

    if (members.length !== selectedMemberIds.length) {
        return NextResponse.json({ error: "Some selected members are not in this group." }, { status: 400 });
    }

    const perParticipantHold = getGroupPerParticipantPrice(WORST_CASE_NOTE_PRICE, members.length);
    const totalHold = getGroupTotalPrice(WORST_CASE_NOTE_PRICE, members.length);

    const broke = members.find(m => parseFloat(m.balance) < perParticipantHold);
    if (broke) {
        return NextResponse.json({ error: "A selected participant has insufficient balance." }, { status: 400 });
    }

    let noteId;

    await sql.begin(async (tx) => {
        const result = await tx`
            INSERT INTO "note" (
                name, created_at, user_id, group_id, status, public_id, style,
                transcript_id, uploaded_filename, source_content, generation_type,
                language, categorization_id, charge_amount, is_trial
            )
            VALUES (
                ${name}, NOW(), ${userId}, ${membership.group_id}, 'pending', ${publicId}, ${style},
                ${transcriptDbId}, ${uploadedFilename}, ${sourceContent}, 'group',
                ${language}, ${categorizationId}, ${totalHold}, false
            )
            RETURNING id
        `;
        noteId = result[0].id;

        for (const member of members) {
            const [held] = await tx`
                UPDATE "user"
                SET balance = balance - ${perParticipantHold}
                WHERE id = ${member.user_id} AND balance >= ${perParticipantHold}
                RETURNING id
            `;
            if (!held) throw new Error(`Member ${member.user_id} has insufficient balance.`);

            await tx`
                INSERT INTO note_access (
                    note_id, user_id, paid_amount, is_original, unlocked_at
                )
                VALUES (${noteId}, ${member.user_id}, ${perParticipantHold}, 1, NOW())
            `;
        }
    });

    generateGroup(noteId, userId, language).catch(err => console.error('Group gen error:', err));

    return NextResponse.json({ publicId, estimatedInputTokens });
}
