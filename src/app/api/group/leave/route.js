import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

        const [membership] = await sql`
            SELECT group_id, role FROM "group_member" WHERE user_id = ${userId} LIMIT 1
        `;
        if (!membership) {
            return NextResponse.json({ error: "You are not in a group." }, { status: 400 });
        }

        await sql.begin(async (tx) => {
            // 1. Remove them from the group (Keep their note_access receipts!)
            await tx`DELETE FROM "group_member" WHERE user_id = ${userId} AND group_id = ${membership.group_id}`;

            // 2. Check who is left
            const remaining = await tx`
                SELECT user_id FROM "group_member" WHERE group_id = ${membership.group_id}
                ORDER BY joined_at ASC
            `;

            // 3. Handle the aftermath
            if (remaining.length === 0) {
                // It's empty! Convert remaining group notes to individual so they don't break the UI
                await tx`UPDATE "note" SET generation_type = 'individual' WHERE group_id = ${membership.group_id}`;
                await tx`UPDATE "exam_prep" SET generation_type = 'individual' WHERE group_id = ${membership.group_id}`;
                
                // Nuke the empty group
                await tx`DELETE FROM "student_group" WHERE id = ${membership.group_id}`;
            } else if (membership.role === 'owner') {
                // Group survives, pass the owner crown to the next oldest member
                await tx`
                    UPDATE "group_member" SET role = 'owner'
                    WHERE user_id = ${remaining[0].user_id}
                `;
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("POST /groups/leave error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}