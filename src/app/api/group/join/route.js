import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { invite_code } = await req.json();

        const existing = await sql`SELECT 1 FROM "group_member" WHERE user_id = ${userId} LIMIT 1`;
        if (existing.length > 0) {
            return NextResponse.json({ error: "You are already in a group." }, { status: 400 });
        }

        const result = await sql.begin(async (tx) => {
            const [group] = await tx`
                SELECT id, max_members FROM "student_group" WHERE invite_code = ${invite_code} LIMIT 1
            `;
            if (!group) throw { status: 404, message: "Invalid invite code." };

            const [{ count }] = await tx`
                SELECT COUNT(*) as count FROM "group_member" WHERE group_id = ${group.id}
            `;
            if (parseInt(count) >= group.max_members) {
                throw { status: 400, message: "Group is full." };
            }

            await tx`
                INSERT INTO "group_member" (group_id, user_id, role, invite_code)
                VALUES (${group.id}, ${userId}, 'member', ${invite_code})
            `;

            return { group_id: group.id };
        });

        return NextResponse.json(result);

    } catch (error) {
        if (error.status) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("POST /group/join error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}