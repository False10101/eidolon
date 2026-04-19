import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { generateExamPrepGroup } from "@/lib/exam-prep/group/generate";

function getGroupTierPrice(totalTokens, groupTier) {
    const PRICES = {
        small: [13, 26, 43, 56],
        study: [23, 45, 75, 98],
        class: [45, 90, 150, 195],
        faculty: [60, 120, 200, 260],
    };
    const tiers = PRICES[groupTier];
    if (totalTokens <= 25000) return tiers[0];
    if (totalTokens <= 50000) return tiers[1];
    if (totalTokens <= 75000) return tiers[2];
    return tiers[3];
}

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Check if user has anything in progress
        const inProgress = await sql`
            SELECT 1 FROM note WHERE user_id = ${userId} AND status IN ('pending', 'reading', 'generating', 'saving')
            UNION ALL
            SELECT 1 FROM exam_prep WHERE user_id = ${userId} AND status IN ('Pending', 'Reading', 'Generating', 'Saving')
            UNION ALL
            SELECT 1 FROM transcript WHERE user_id = ${userId} AND status IN ('Initializing', 'Transcribing')
            LIMIT 1
        `;
        if (inProgress.length > 0) {
            return NextResponse.json({ error: 'You already have a generation in progress. Please wait for it to complete.' }, { status: 400 });
        }

        // 2. Get Group Membership Info
        const [membership] = await sql`
            SELECT gm.group_id, sg.tier
            FROM "group_member" gm
            JOIN "student_group" sg ON sg.id = gm.group_id
            WHERE gm.user_id = ${userId}
            LIMIT 1
        `;
        if (!membership) return NextResponse.json({ error: "You are not in a group." }, { status: 400 });

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

        // 3. Process Note Sources
        let noteContents = [];
        if (noteIds.length > 0) {
            const notes = await sql`
                SELECT id, name, content FROM note
                WHERE public_id = ANY(${noteIds}) AND user_id = ${userId}
            `;
            noteContents = notes;
        }

        // 4. Process File Sources
        let fileContents = [];
        for (const file of files) {
            const text = await file.text();
            fileContents.push({ name: file.name, content: text });
        }

        const totalChars = [
            ...noteContents.map(n => n.content ?? ''),
            ...fileContents.map(f => f.content),
        ].join('').length;

        const estimatedTokens = Math.ceil(totalChars / 4) * 1.5; // Scale for output
        if (estimatedTokens > 100000) { // Approx 65k input tokens
            return NextResponse.json({ error: 'Source material is too large.' }, { status: 400 });
        }

        // 5. Group Economy Math
        const totalPrice = getGroupTierPrice(estimatedTokens, membership.tier);
        const members = await sql`
            SELECT gm.user_id, u.balance
            FROM "group_member" gm
            JOIN "user" u ON u.id = gm.user_id
            WHERE gm.group_id = ${membership.group_id}
        `;

        const actualSplit = parseFloat((totalPrice / members.length).toFixed(2));
        const actualGeneratorCharge = parseFloat((actualSplit * 0.5).toFixed(2));

        // 6. Check everyone's balance
        const broke = members.find(m => {
            const charge = m.user_id === userId ? actualGeneratorCharge : actualSplit;
            return parseFloat(m.balance) < charge;
        });
        if (broke) return NextResponse.json({ error: "A group member has insufficient balance." }, { status: 400 });

        const questionTypeStr = questionTypes.join(',');

        let examPrepId, publicId;

        // 7. Atomic Database Transaction
        await sql.begin(async (tx) => {
            const [row] = await tx`
                INSERT INTO exam_prep (
                    user_id, group_id, label, question_type, difficulty, 
                    status, charge_amount, created_at, generation_type
                )
                VALUES (
                    ${userId}, ${membership.group_id}, ${label}, ${questionTypeStr}, ${difficulty}, 
                    'Pending', ${totalPrice}, NOW(), 'group'
                )
                RETURNING id, public_id
            `;
            examPrepId = row.id;
            publicId = row.public_id;

            // Insert Sources
            for (const note of noteContents) {
                await tx`
                    INSERT INTO exam_prep_sources (exam_prep_id, source_type, source_note_id)
                    VALUES (${examPrepId}, 'note', ${note.id})
                `;
            }
            for (const file of fileContents) {
                await tx`
                    INSERT INTO exam_prep_sources (exam_prep_id, source_type, file_name, file_content)
                    VALUES (${examPrepId}, 'file', ${file.name}, ${file.content})
                `;
            }
        });

        // 8. Fire Worker
        generateExamPrepGroup(
            examPrepId,
            publicId,
            userId,
            membership.group_id,
            totalPrice,
            questionTypes,
            difficulty
        ).catch(err => console.error('Group Exam prep generation error:', err));

        return NextResponse.json({ publicId });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}