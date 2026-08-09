import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [membership] = await sql`SELECT group_id FROM "group_member" WHERE user_id = ${userId} LIMIT 1`;

        if (!membership) {
            return NextResponse.json({ group: null });
        }

        const group_members = await sql`
            SELECT
                gm.user_id,
                u.username,
                u.avatar_url,
                u.balance,
                (gm.user_id = ${userId}) AS is_me
            FROM "group_member" gm
            JOIN "user" u ON u.id = gm.user_id
            WHERE gm.group_id = ${membership.group_id}
            ORDER BY u.username
        `;

        return NextResponse.json({ group_members });
    } catch (error) {
        console.error("GET /groups/group-members error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
