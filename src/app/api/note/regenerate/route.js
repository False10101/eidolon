import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { generate } from "@/lib/note/individual/generate";
import { generateGroup } from "@/lib/note/group/generate";
import { getGroupTierPrice } from "../generate/group/route";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req) {
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
                return (parseFloat(m.balance) || 0) < charge;
            });
            if (broke) return NextResponse.json({ error: "A group member has insufficient balance to authorize the generation." }, { status: 400 });

            // 3. Deduct the max hold UPFRONT in a transaction and reset the note
            await sql.begin(async (tx) => {
                for (const member of members) {
                    const charge = member.user_id === userId ? maxGeneratorCharge : maxSplit;
                    const [held] = await tx`UPDATE "user" SET balance = balance - ${charge} WHERE id = ${member.user_id} AND balance >= ${charge} RETURNING id`;
                    if (!held) throw new Error(`Member ${member.user_id} has insufficient balance.`);
                }

                await tx`
                    UPDATE "note"
                    SET status = 'pending', content = null, created_at = NOW()
                    WHERE id = ${note.id}
                `;
            });

            // 4. Pass the tier and maxHold to the updated worker
            generateGroup(note.id, userId, membership.group_id, membership.tier, maxPriceHold, note.language).catch(err => console.error('Group regen error:', err));

            return NextResponse.json({ publicId });
        } catch (error) {
            console.error(error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    } else {
        // Individual logic - unchanged, already correct!
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
                    error: `Insufficient balance. This generation may cost up to ${worstCaseCost} credits. Your balance is ${balance} credits.`
                }, { status: 400 });
            }

            // Deduct hold upfront
            const [held] = await sql`UPDATE "user" SET balance = balance - ${worstCaseCost} WHERE id = ${userId} AND balance >= ${worstCaseCost} RETURNING id`;
            if (!held) return NextResponse.json({ error: 'Insufficient balance.' }, { status: 400 });

            await sql`
                UPDATE "note"
                SET status = 'pending', content = null, created_at = NOW()
                WHERE id = ${note.id}
            `;

            // Call worker with worstCaseCost
            generate(note.id, userId, worstCaseCost, note.language).catch(err => console.error('Regen error:', err));

            return NextResponse.json({ publicId });
        } catch (error) {
            console.error(error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    }
}