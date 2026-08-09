import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const history = await sql`
            SELECT
                a.type,
                CASE
                    WHEN a.type = 'note' AND a.title = 'Unlocked group note' THEN CONCAT('Unlocked note: ', COALESCE(n.name, a.title))
                    WHEN a.type = 'exam_prep' AND a.title = 'Unlocked group exam prep' THEN CONCAT('Unlocked exam prep: ', COALESCE(e.label, a.title))
                    WHEN a.type = 'rebate' AND a.title = 'Group note unlocked by new member' THEN CONCAT('Unlock rebate: ', COALESCE(rebate_note.name, a.title))
                    WHEN a.type = 'rebate' AND a.title = 'Group exam prep unlocked by new member' THEN CONCAT('Unlock rebate: ', COALESCE(rebate_exam.label, a.title))
                    ELSE a.title
                END AS description,
                a.charge_amount,
                a.balance_after,
                a.date as created_at,
                a.ref
            FROM "activity" a
            LEFT JOIN "note" n ON n.id = a.respective_table_id AND a.type = 'note'
            LEFT JOIN "exam_prep" e ON e.id = a.respective_table_id AND a.type = 'exam_prep'
            LEFT JOIN "note" rebate_note ON rebate_note.id = a.respective_table_id AND a.type = 'rebate' AND a.title = 'Group note unlocked by new member'
            LEFT JOIN "exam_prep" rebate_exam ON rebate_exam.id = a.respective_table_id AND a.type = 'rebate' AND a.title = 'Group exam prep unlocked by new member'
            WHERE a.user_id = ${userId}
            ORDER BY date DESC
            LIMIT 50
        `;

        return NextResponse.json({ history });
    } catch (error) {
        console.error("GET /profile/history error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
