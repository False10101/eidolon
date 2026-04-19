import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import random from "random-string-generator";
import { verifyUserData } from "@/lib/auth/verify";

const generateUniqueInviteCode = async (tx) => {
    while (true) {
        const code = random(7);
        const [existing] = await tx`
            SELECT 1 FROM "student_group" WHERE invite_code = ${code} LIMIT 1
        `;
        if (!existing) return code;
    }
};

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, tier } = await req.json();

        const validTiers = ["small", "study", "class", "faculty"];
        if (!validTiers.includes(tier)) {
            return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
        }

        const existing = await sql`SELECT 1 FROM "group_member" WHERE user_id = ${userId} LIMIT 1`;
        if (existing.length > 0) {
            return NextResponse.json({ error: "You are already in a group." }, { status: 400 });
        }

        const tierMaxMembers = { small: 5, study: 10, class: 25, faculty: 50 };

        const result = await sql.begin(async (tx) => {
            const inviteCode = await generateUniqueInviteCode(tx);

            const [newGrp] = await tx`
                INSERT INTO "student_group" (name, owner_id, tier, max_members, invite_code)
                VALUES (${name}, ${userId}, ${tier}, ${tierMaxMembers[tier]}, ${inviteCode})
                RETURNING id
            `;

            await tx`
                INSERT INTO "group_member" (group_id, user_id, role, invite_code)
                VALUES (${newGrp.id}, ${userId}, 'owner', ${inviteCode})
            `;

            return { group_id: newGrp.id, invite_code: inviteCode };
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("POST /group error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}