import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { generate } from "@/lib/note/individual/generate";
import { generateGroup } from "@/lib/note/group/generate";

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
    const userId = await verifyUserData(req);
    if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        return NextResponse.json({ error: 'You already have a generation in progress. Please wait for it to complete.' }, { status: 400 });
    }

    const { publicId } = await req.json();

    const userRows = await sql`SELECT balance FROM "user" WHERE id = ${userId}`;
    const balance = userRows[0].balance;

    const noteRows = await sql`SELECT * FROM "note" WHERE public_id = ${publicId} AND user_id = ${userId}`;
    const note = noteRows[0];


    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    if (note.generation_type === "group") {
        try {
            const [membership] = await sql`
                SELECT gm.group_id, sg.tier, sg.max_members
                FROM "group_member" gm
                JOIN "student_group" sg ON sg.id = gm.group_id
                WHERE gm.user_id = ${userId}
                LIMIT 1
            `;
            if (!membership) return NextResponse.json({ error: "You are not in a group." }, { status: 400 });

            let sourceContent = note.source_content;
            if (!sourceContent && note.transcript_id) {
                const transcriptRows = await sql`SELECT content FROM "transcript" WHERE id = ${note.transcript_id}`;
                sourceContent = transcriptRows[0]?.content;
            }
            if (!sourceContent) return NextResponse.json({ error: "No source content to regenerate from." }, { status: 400 });

            const estimatedInputTokens = Math.ceil(sourceContent.length / 4);
            if (estimatedInputTokens > 65000) {
                return NextResponse.json({ error: "Transcript is too long. Maximum input is ~65,000 tokens." }, { status: 400 });
            }

            const estimatedTokens = estimatedInputTokens * 2.5;
            const totalPrice = getGroupTierPrice(estimatedTokens, membership.tier);

            const members = await sql`
                SELECT gm.user_id, u.balance
                FROM "group_member" gm
                JOIN "user" u ON u.id = gm.user_id
                WHERE gm.group_id = ${membership.group_id}
            `;

            const actualSplit = parseFloat((totalPrice / members.length).toFixed(2));
            const actualGeneratorCharge = parseFloat((actualSplit * 0.5).toFixed(2));

            const broke = members.find(m => {
                const charge = m.user_id === userId ? actualGeneratorCharge : actualSplit;
                return (parseFloat(m.balance) || 0) < charge;
            });
            if (broke) return NextResponse.json({ error: "A group member has insufficient balance." }, { status: 400 });

            await sql`
                UPDATE "note"
                SET status = 'pending', content = null, created_at = NOW()
                WHERE id = ${note.id}
            `;

            generateGroup(note.id, userId, membership.group_id, totalPrice, note.language).catch(err => console.error('Group regen error:', err));

            return NextResponse.json({ publicId });
        } catch (error) {
            console.error(error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    } else {
        try {
            let sourceContent = note.source_content;
            if (!sourceContent && note.transcript_id) {
                const transcriptRows = await sql`SELECT content FROM "transcript" WHERE id = ${note.transcript_id}`;
                sourceContent = transcriptRows[0]?.content;
            }
            if (!sourceContent) return NextResponse.json({ error: "No source content to regenerate from." }, { status: 400 });

            const estimatedInputTokens = Math.ceil(sourceContent.length / 4);
            if (estimatedInputTokens > 65000) {
                return NextResponse.json({ error: "Transcript is too long. Maximum input is ~65,000 tokens." }, { status: 400 });
            }

            const worstCaseCost = 13;

            if (balance < worstCaseCost) {
                return NextResponse.json({
                    error: `Insufficient balance. This generation may cost up to ฿${worstCaseCost}. Your balance is ฿${balance}.`
                }, { status: 400 });
            }

            await sql`UPDATE "user" SET balance = balance - ${worstCaseCost} WHERE id = ${userId}`;

            await sql`
                UPDATE "note"
                SET status = 'pending', content = null, created_at = NOW()
                WHERE id = ${note.id}
            `;

            generate(note.id, userId, worstCaseCost, note.language).catch(err => console.error('Regen error:', err));

            return NextResponse.json({ publicId });
        } catch (error) {
            console.error(error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    }
}