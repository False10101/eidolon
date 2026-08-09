import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req, { params }) {
    const userId = await verifyUserData(req);

    if (userId === null) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { publicId } = await params;

    const rows = await sql`
        SELECT n.status
        FROM note n
        LEFT JOIN student_group sg ON sg.id = n.group_id
        WHERE n.public_id = ${publicId}
        AND (
            n.user_id = ${userId}
            OR (n.generation_type = 'group' AND sg.owner_id = ${userId})
        )
    `;

    if (rows.length < 1) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ status: rows[0].status });
}
