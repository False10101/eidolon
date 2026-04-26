import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { generateExamPrep } from "@/lib/exam-prep/individual/generate";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limited = await rateLimit(`rl:ep-gen:${userId}`, 10, 60);
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

    const form = await req.formData();
    const noteIds = form.getAll('note_ids[]');
    const files = form.getAll('files[]');
    const difficulty = form.get('difficulty');
    const questionTypes = form.getAll('question_types[]');
    const label = form.get('label');

    const VALID_DIFFICULTIES = ['easy', 'normal', 'hard'];
    const VALID_QUESTION_TYPES = ['tf', 'mcq', 'theory', 'scenario', 'calculation'];

    if (!difficulty || questionTypes.length === 0 || label === null || label === "") {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
        return NextResponse.json({ error: 'Invalid difficulty.' }, { status: 400 });
    }

    if (!questionTypes.every(qt => VALID_QUESTION_TYPES.includes(qt))) {
        return NextResponse.json({ error: 'Invalid question type.' }, { status: 400 });
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
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: `File "${file.name}" is too large. Maximum size is 10MB.` }, { status: 400 });
        }
        const text = await file.text();
        fileContents.push({ name: file.name, content: text });
    }

    const totalChars = [
        ...noteContents.map(n => n.content ?? ''),
        ...fileContents.map(f => f.content),
    ].join('').length;

    const estimatedTokens = Math.ceil(totalChars / 4);

    if (estimatedTokens > 65000) {
        return NextResponse.json({ error: 'Source material is too large. Please reduce the number of notes or files.' }, { status: 400 });
    }

    const worstCaseCost = 37;

    const [user] = await sql`SELECT balance FROM "user" WHERE id = ${userId}`;
    if (!user || Number(user.balance) < worstCaseCost) {
        return NextResponse.json({ error: 'Insufficient balance.' }, { status: 402 });
    }

    const questionTypeStr = questionTypes.join(',');
    let examPrepId, publicId;

    try {
        await sql.begin(async (tx) => {
            const [held] = await tx`UPDATE "user" SET balance = balance - ${worstCaseCost} WHERE id = ${userId} AND balance >= ${worstCaseCost} RETURNING id`;
            if (!held) throw new Error('Insufficient balance.');

            const [row] = await tx`
                INSERT INTO exam_prep (user_id, label, question_type, difficulty, status, charge_amount, created_at, generation_type)
                VALUES (${userId}, ${label}, ${questionTypeStr}, ${difficulty}, 'Pending', ${worstCaseCost}, NOW(), 'individual')
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
    } catch (error) {
        console.error("Endpoint DB Setup Failed:", error);
        return NextResponse.json({ error: 'Failed to initiate generation. You have not been charged.' }, { status: 500 });
    }

    generateExamPrep({
        examPrepId,
        publicId,
        userId,
        noteContents,
        fileContents,
        questionTypes,
        difficulty,
        worstCaseCost,
        label
    }).catch(err => console.error('Exam prep generation error:', err));

    return NextResponse.json({ publicId });
}