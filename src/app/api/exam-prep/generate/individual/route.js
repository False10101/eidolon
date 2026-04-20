import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { generateExamPrep } from "@/lib/exam-prep/individual/generate";

export async function POST(req) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    const form = await req.formData();
    const noteIds = form.getAll('note_ids[]');
    const files = form.getAll('files[]');
    const difficulty = form.get('difficulty');
    const questionTypes = form.getAll('question_types[]');
    const label = form.get('label');

    if (!difficulty || questionTypes.length === 0 || label === null || label === "") {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (noteIds.length === 0 && files.length === 0) {
        return NextResponse.json({ error: 'At least one source is required.' }, { status: 400 });
    }

    let noteContents = [];
    if (noteIds.length > 0) {
        const notes = await sql`
            SELECT id, name, content FROM note
            WHERE public_id = ANY(${noteIds}) AND user_id = ${userId}
        `;
        if (notes.length !== noteIds.length) {
            return NextResponse.json({ error: 'One or more notes not found.' }, { status: 404 });
        }
        noteContents = notes;
    }

    let fileContents = [];
    for (const file of files) {
        const text = await file.text();
        fileContents.push({ name: file.name, content: text });
    }

    const totalChars = [
        ...noteContents.map(n => n.content ?? ''),
        ...fileContents.map(f => f.content),
    ].join('').length;

    const estimatedTokens = Math.ceil(totalChars / 4) * 2;

    if (estimatedTokens > 100000) {
        return NextResponse.json({ error: 'Source material is too large. Please reduce the number of notes or files.' }, { status: 400 });
    }

    const estimatedCost = estimatedTokens < 25000 ? 3
        : estimatedTokens < 50000 ? 6
            : estimatedTokens < 75000 ? 10
                : 13;

    const [user] = await sql`SELECT balance FROM "user" WHERE id = ${userId}`;
    if (!user || Number(user.balance) < estimatedCost) {
        return NextResponse.json({ error: 'Insufficient balance.' }, { status: 402 });
    }

    await sql`UPDATE "user" SET balance = balance - ${estimatedCost} WHERE id = ${userId}`;

    const questionTypeStr = questionTypes.join(',');

    let examPrepId, publicId;

    await sql.begin(async (tx) => {
        const [row] = await tx`
            INSERT INTO exam_prep (user_id, label, question_type, difficulty, status, charge_amount, created_at, generation_type)
            VALUES (${userId}, ${label}, ${questionTypeStr}, ${difficulty}, 'Pending', ${estimatedCost}, NOW(), 'individual')
            RETURNING id, public_id
        `;
        examPrepId = row.id;
        publicId = row.public_id;

        for (const note of noteContents) {
            await tx`
                INSERT INTO exam_prep_sources (exam_prep_id, source_type, source_note_id, file_name, file_content)
                VALUES (${examPrepId}, 'note', ${note.id}, NULL, NULL)
            `;
        }

        for (const file of fileContents) {
            await tx`
                INSERT INTO exam_prep_sources (exam_prep_id, source_type, source_note_id, file_name, file_content)
                VALUES (${examPrepId}, 'file', NULL, ${file.name}, ${file.content})
            `;
        }
    });

    generateExamPrep({
        examPrepId,
        publicId,
        userId,
        noteContents,
        fileContents,
        questionTypes,
        difficulty,
        estimatedCost,
    }).catch(err => console.error('Exam prep generation error:', err));

    return NextResponse.json({ publicId });
}