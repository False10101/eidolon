import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { username } = await req.json();
        if (!username?.trim()) return NextResponse.json({ error: "Username is required." }, { status: 400 });
        if (username.trim().length > 50) return NextResponse.json({ error: "Username too long." }, { status: 400 });

        const [existing] = await sql`
            SELECT id FROM "user" WHERE username = ${username.trim()} AND id != ${userId} LIMIT 1
        `;
        if (existing) return NextResponse.json({ error: "Username already taken." }, { status: 400 });

        await sql`UPDATE "user" SET username = ${username.trim()} WHERE id = ${userId}`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("POST /profile/update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}