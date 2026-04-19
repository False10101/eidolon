import { verifyUserData } from "@/lib/auth/verify";
import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";

export async function GET(req) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [user] = await sql`SELECT balance, line_user_id, line_display_name FROM "user" WHERE id = ${userId}`;
    return NextResponse.json(user);
}