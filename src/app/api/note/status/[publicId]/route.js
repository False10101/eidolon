import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req, { params }) {
    const userId = await verifyUserData(req);

    if (userId === null) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { publicId } = await params;

    const rows = await sql`SELECT status FROM "note" WHERE public_id = ${publicId} AND user_id = ${userId}`;

    if (rows.length < 1) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ status: rows[0].status });
}