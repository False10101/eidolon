import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function DELETE(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await sql.begin(async (tx) => {
            await tx`DELETE FROM "group_member" WHERE user_id = ${userId}`;
            await tx`DELETE FROM "pending_topups" WHERE user_id = ${userId}`;
            await tx`DELETE FROM "user" WHERE id = ${userId}`;
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /profile/delete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}