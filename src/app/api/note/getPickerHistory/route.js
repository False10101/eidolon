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
            SELECT n.name, n.public_id, n.generation_type, n.created_at, n.style, n.charge_amount, true as is_unlocked
            FROM "note" n
            WHERE n.user_id = ${userId}
            AND (n.generation_type = 'individual' OR n.generation_type IS NULL)
            ORDER BY n.created_at DESC
        `;

        let group = [];
        if (membership) {
            group = await sql`
                SELECT 
                    n.name, n.public_id, n.generation_type, n.created_at, n.style, n.unlock_price, n.charge_amount, true as is_unlocked
                FROM "note" n
                JOIN note_access na ON na.note_id = n.id
                WHERE n.group_id = ${membership.group_id}
                AND n.generation_type = 'group'
                AND na.user_id = ${userId}
                ORDER BY n.created_at DESC
            `;
        }

        const combined = [...individual, ...group].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return NextResponse.json(combined);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
