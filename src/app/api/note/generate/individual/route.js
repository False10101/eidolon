import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { v4 as uuidv4 } from "uuid";
import { generate } from "@/lib/note/individual/generate";
import { franc } from "franc-min";
import languageMap from "@/lib/languageMap";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req) {
    const userId = await verifyUserData(req);

    if (userId === null) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await rateLimit(`rl:note-gen:${userId}`, 10, 60);
    if (limited) return limited;

    const inProgress = await sql`
        SELECT 1 FROM note
        WHERE user_id = ${userId}
        AND status IN ('pending', 'reading', 'generating', 'saving')
        UNION ALL
        SELECT 1 FROM note
        WHERE status IN ('pending', 'reading', 'generating', 'saving')
        AND id IN (
            SELECT note_id FROM note_access WHERE user_id = ${userId}
        )
        UNION ALL
        SELECT 1 FROM exam_prep
        WHERE user_id = ${userId}
        AND status IN ('Pending', 'Reading', 'Generating', 'Saving')
        UNION ALL
        SELECT 1 FROM exam_prep
        WHERE status IN ('Pending', 'Reading', 'Generating', 'Saving')
        AND id IN (
            SELECT exam_prep_id FROM exam_prep_access WHERE user_id = ${userId}
        )
        UNION ALL
        SELECT 1 FROM transcript
        WHERE user_id = ${userId}
        AND status IN ('Initializing', 'Transcribing')
        LIMIT 1
    `;

    if (inProgress.length > 0) {
        return NextResponse.json({ error: 'You already have a generation in progress. Please wait for it to complete.' }, { status: 400 });
    }

    const userRows = await sql`SELECT balance, trial_used FROM "user" WHERE id = ${userId}`;
    const balance = userRows[0].balance;
    const trialUsed = userRows[0].trial_used ?? false;

    const formData = await req.formData();
    const file = formData.get('file') || null;
    const transcript_id = formData.get('transcript_id') || null;

    if (file === null && transcript_id === null) {
        return NextResponse.json({ error: "Please upload/select a transcript file!" }, { status: 400 });
    }

    if (file !== null && transcript_id !== null) {
        return NextResponse.json({ error: "Please upload/select only one file!" }, { status: 400 });
    }

    const name = formData.get('name');
    let language = formData.get('target_language') || null;
    const style = formData.get('style') || 'standard';
    const generation_type = 'individual';
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


    if (estimatedInputTokens > 65000) {
        return NextResponse.json({ error: "Transcript is too long. Maximum input is ~65,000 tokens." }, { status: 400 });
    }

    const worstCaseCost = 37;

    let isTrial = false;

    if (balance < worstCaseCost) {
        if (!trialUsed) {
            const previousNotes = await sql`SELECT 1 FROM note WHERE user_id = ${userId} LIMIT 1`;
            if (previousNotes.length === 0) {
                isTrial = true;
            }
        }
        
        if (!isTrial) {
            return NextResponse.json({
                error: `Insufficient balance. This generation may cost up to ${worstCaseCost} credits. Your balance is ${balance} credits.`
            }, { status: 400 });
        }
    }

    if (isTrial) {
        await sql`UPDATE "user" SET trial_used = true WHERE id = ${userId}`;
    } else {
        const [held] = await sql`UPDATE "user" SET balance = balance - ${worstCaseCost} WHERE id = ${userId} AND balance >= ${worstCaseCost} RETURNING id`;
        if (!held) return NextResponse.json({ error: 'Insufficient balance.' }, { status: 400 });
    }

    const result = await sql`
        INSERT INTO "note" (name, created_at, user_id, status, public_id, style, transcript_id, uploaded_filename, source_content, generation_type, language, is_trial)
        VALUES (${name}, NOW(), ${userId}, 'pending', ${publicId}, ${style}, ${transcriptDbId}, ${uploadedFilename}, ${sourceContent}, ${generation_type}, ${language}, ${isTrial})
        RETURNING id
    `;

    const noteId = result[0].id;
    generate(noteId, userId, worstCaseCost, language).catch(err => console.error('Generation error:', err));

    return NextResponse.json({ publicId });
}