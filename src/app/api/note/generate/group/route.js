import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { v4 as uuidv4 } from "uuid";
import { generateGroup } from "@/lib/note/group/generate";
import { franc } from "franc-min";
import languageMap from "@/lib/languageMap";
import { rateLimit } from "@/lib/rateLimit";

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

    const [membership] = await sql`
        SELECT gm.group_id, gm.role, sg.tier, sg.max_members, sg.id as group_id
        FROM "group_member" gm
        JOIN "student_group" sg ON sg.id = gm.group_id
        WHERE gm.user_id = ${userId}
        LIMIT 1
    `;
    if (!membership) return NextResponse.json({ error: "You are not in a group." }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get('file') || null;
    const transcript_id = formData.get('transcript_id') || null;

    if (file === null && transcript_id === null) return NextResponse.json({ error: "Please upload/select a transcript file!" }, { status: 400 });
    if (file !== null && transcript_id !== null) return NextResponse.json({ error: "Please upload/select only one file!" }, { status: 400 });

    const name = formData.get('name');
    let language = formData.get('target_language') || null;
    const style = formData.get('style') || 'standard';
    const publicId = uuidv4();

    let sourceContent = null;
    let uploadedFilename = null;
    let transcriptDbId = null;

    if (transcript_id) {
        const rows = await sql`SELECT id, content FROM "transcript" WHERE public_id = ${transcript_id} AND user_id = ${userId}`;
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

    // 1. Calculate the MAXIMUM possible tier price for the hold
    const maxPriceHold = getGroupTierPrice(Infinity, membership.tier);

    const members = await sql`
        SELECT gm.user_id, u.balance
        FROM "group_member" gm
        JOIN "user" u ON u.id = gm.user_id
        WHERE gm.group_id = ${membership.group_id}
    `;

    const maxSplit = parseFloat((maxPriceHold / members.length).toFixed(2));
    const maxGeneratorCharge = parseFloat((maxSplit * 0.5).toFixed(2));

    // 2. Ensure all members can afford the MAX hold
    const broke = members.find(m => {
        const charge = m.user_id === userId ? maxGeneratorCharge : maxSplit;
        return parseFloat(m.balance) < charge;
    });
    if (broke) {
        return NextResponse.json({ error: "A group member has insufficient balance to authorize the generation." }, { status: 400 });
    }

    let noteId;

    // 3. Deduct the max hold UPFRONT in a transaction
    await sql.begin(async (tx) => {
        for (const member of members) {
            const charge = member.user_id === userId ? maxGeneratorCharge : maxSplit;
            const [held] = await tx`UPDATE "user" SET balance = balance - ${charge} WHERE id = ${member.user_id} AND balance >= ${charge} RETURNING id`;
            if (!held) throw new Error(`Member ${member.user_id} has insufficient balance.`);
        }

        const result = await tx`
            INSERT INTO "note" (name, created_at, user_id, group_id, status, public_id, style, transcript_id, uploaded_filename, source_content, generation_type, language)
            VALUES (${name}, NOW(), ${userId}, ${membership.group_id}, 'pending', ${publicId}, ${style}, ${transcriptDbId}, ${uploadedFilename}, ${sourceContent}, 'group', ${language})
            RETURNING id
        `;
        noteId = result[0].id;
    });

    // Pass the tier and the maxHold so the worker can calculate refunds
    generateGroup(noteId, userId, membership.group_id, membership.tier, maxPriceHold, language).catch(err => console.error('Group gen error:', err));

    return NextResponse.json({ publicId });
}