import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [membership] = await sql`
            SELECT group_id FROM "group_member" WHERE user_id = ${userId} LIMIT 1
        `;

        const individual = await sql`
            SELECT n.name, n.public_id, n.generation_type, n.created_at, n.style, n.charge_amount
            FROM "note" n
            WHERE n.user_id = ${userId}
            AND (n.generation_type = 'individual' OR n.generation_type IS NULL)
            ORDER BY n.created_at DESC
        `;

        let group = [];
        if (membership) {
            group = await sql`
                SELECT
                    n.name, n.public_id, n.generation_type, n.created_at, n.style, n.unlock_price, n.charge_amount,
                    (
                        n.user_id = ${userId} OR
                        EXISTS (
                            SELECT 1 FROM student_group sg
                            WHERE sg.id = n.group_id AND sg.owner_id = ${userId}
                        ) OR
                        EXISTS (
                            SELECT 1 FROM note_access na
                            WHERE na.note_id = n.id AND na.user_id = ${userId}
                        )
                    ) AS is_unlocked
                FROM "note" n
                WHERE n.group_id = ${membership.group_id}
                AND n.generation_type = 'group'
                ORDER BY n.created_at DESC
            `;
        }

        return NextResponse.json({ group, individual });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
