import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [user] = await sql`
            SELECT id, username, email, balance, avatar_url, created_at
            FROM "user" WHERE id = ${userId}
        `;
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        return NextResponse.json({ profile: user });
    } catch (error) {
        console.error("GET /profile/me error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}