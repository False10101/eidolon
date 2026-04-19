import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { target_user_id } = await req.json();

        const inProgress = await sql`
            SELECT 1 FROM note
            WHERE user_id = ${target_user_id}
            AND status IN ('pending', 'reading', 'generating', 'saving')
            UNION ALL
            SELECT 1 FROM note
            WHERE status IN ('pending', 'reading', 'generating', 'saving')
            AND id IN (
                SELECT note_id FROM note_access WHERE user_id = ${target_user_id}
            )
            UNION ALL
            SELECT 1 FROM exam_prep
            WHERE user_id = ${target_user_id}
            AND status IN ('Pending', 'Reading', 'Generating', 'Saving')
            UNION ALL
            SELECT 1 FROM exam_prep
            WHERE status IN ('Pending', 'Reading', 'Generating', 'Saving')
            AND id IN (
                SELECT exam_prep_id FROM exam_prep_access WHERE user_id = ${target_user_id}
            )
            UNION ALL
            SELECT 1 FROM transcript
            WHERE user_id = ${target_user_id}
            AND status IN ('Initializing', 'Transcribing')
            LIMIT 1
        `;
        if (inProgress.length > 0) {
            return NextResponse.json({ error: 'You cannot kick this user while they are actively generating a note.' }, { status: 400 });
        }

        const [requester] = await sql`
            SELECT group_id, role FROM "group_member" WHERE user_id = ${userId} LIMIT 1
        `;
        if (!requester || requester.role !== 'owner') {
            return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
        }

        const [target] = await sql`
            SELECT user_id FROM "group_member"
            WHERE user_id = ${target_user_id} AND group_id = ${requester.group_id}
            LIMIT 1
        `;
        if (!target) {
            return NextResponse.json({ error: "User not in your group." }, { status: 404 });
        }

        await sql.begin(async (tx) => {
            await tx`DELETE FROM "group_member" WHERE user_id = ${target_user_id} AND group_id = ${requester.group_id}`;
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("POST /groups/kick error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}