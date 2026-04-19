import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const history = await sql`
            SELECT type, title as description, charge_amount, balance_after, date as created_at, ref
            FROM "activity"
            WHERE user_id = ${userId}
            ORDER BY date DESC
            LIMIT 50
        `;

        return NextResponse.json({ history });
    } catch (error) {
        console.error("GET /profile/history error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}