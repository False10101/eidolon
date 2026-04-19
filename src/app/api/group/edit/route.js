import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: "Name is required." }, { status: 400 });
        }

        const [membership] = await sql`
            SELECT group_id, role FROM "group_member" WHERE user_id = ${userId} LIMIT 1
        `;
        if (!membership || membership.role !== 'owner') {
            return NextResponse.json({ error: "Only the group owner can edit the name." }, { status: 403 });
        }

        await sql`
            UPDATE "student_group" SET name = ${name.trim()} WHERE id = ${membership.group_id}
        `;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("POST /group/edit error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}