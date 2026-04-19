import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [membership] = await sql`
            SELECT group_id FROM "group_member" WHERE user_id = ${userId} LIMIT 1
        `;
        if (!membership) {
            return NextResponse.json({ group: null });
        }

        const [group] = await sql`
            SELECT id, name, tier, max_members, invite_code FROM "student_group" WHERE id = ${membership.group_id}
        `;

        const members = await sql`
            SELECT gm.user_id, gm.role, gm.joined_at, u.username, u.avatar_url,
                (gm.user_id = ${userId}) as is_me
            FROM "group_member" gm
            JOIN "user" u ON u.id = gm.user_id
            WHERE gm.group_id = ${group.id}
            ORDER BY gm.joined_at ASC
        `;

        return NextResponse.json({ group: { ...group, members } });

    } catch (error) {
        console.error("GET /groups/me error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}