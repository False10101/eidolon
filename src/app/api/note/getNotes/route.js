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
            SELECT name, public_id, style, lecture_topic, created_at, charge_amount, total_tokens
            FROM "note"
            WHERE user_id = ${userId}
            AND generation_type = 'individual'
            ORDER BY created_at DESC
        `;

        let group = [];
        if (membership) {
            group = await sql`
                SELECT 
                    n.name, n.public_id, n.style, n.lecture_topic,
                    n.created_at, n.unlock_price, n.charge_amount, n.total_tokens,
                    (
                        n.user_id = ${userId} OR
                        EXISTS (
                            SELECT 1 FROM "note_access" na
                            WHERE na.note_id = n.id AND na.user_id = ${userId}
                        )
                    ) AS is_unlocked
                FROM "note" n
                WHERE n.group_id = ${membership.group_id}
                AND n.generation_type = 'group'
                AND n.status = 'completed'
                ORDER BY n.created_at DESC
            `;
        }

        return NextResponse.json({ individual, group });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}