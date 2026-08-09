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
        const inviteCode = String(invite_code || '').trim();
        if (!inviteCode) {
            return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
        }

        const existing = await sql`SELECT 1 FROM "group_member" WHERE user_id = ${userId} LIMIT 1`;
        if (existing.length > 0) {
            return NextResponse.json({ error: "You are already in a group." }, { status: 400 });
        }

        const result = await sql.begin(async (tx) => {
            const [group] = await tx`
                SELECT id
                FROM "student_group"
                WHERE invite_code = ${inviteCode}
                LIMIT 1
                FOR UPDATE
            `;
            if (!group) throw { status: 404, message: "Invalid invite code." };

            await tx`
                INSERT INTO "group_member" (group_id, user_id, role)
                VALUES (${group.id}, ${userId}, 'member')
            `;

            await tx`
                UPDATE "student_group" sg
                SET member_count = (
                    SELECT COUNT(*)::int
                    FROM "group_member" gm
                    WHERE gm.group_id = sg.id
                )
                WHERE sg.id = ${group.id}
            `;

            return { group_id: group.id };
        });

        return NextResponse.json(result);

    } catch (error) {
        if (error.status) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        if (error.code === '23505') {
            return NextResponse.json({ error: "You are already in a group." }, { status: 400 });
        }
        console.error("POST /group/join error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
