import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req, { params }) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { publicId } = await params;

    const [examPrep] = await sql`
        SELECT status FROM exam_prep
        WHERE public_id = ${publicId} AND user_id = ${userId}
    `;

    if (!examPrep) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ status: examPrep.status });
}