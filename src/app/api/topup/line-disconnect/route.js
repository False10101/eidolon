import { verifyUserData } from "@/lib/auth/verify";
import { sql } from "@/lib/storage/db";
import { NextResponse } from "next/server";

export async function POST(req) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await sql`UPDATE "user" SET line_user_id = NULL, line_display_name = NULL WHERE id = ${userId}`;
    return NextResponse.json({ ok: true });
}