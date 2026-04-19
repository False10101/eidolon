import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // notes user generated themselves
        const ownRows = await sql`
            SELECT n.name, n.public_id, n.generation_type, n.created_at, n.style
            FROM "note" n
            WHERE n.user_id = ${userId}
            ORDER BY n.created_at DESC
        `;

        // group notes user has access to but didn't generate
        const accessRows = await sql`
            SELECT n.name, n.public_id, n.generation_type, n.created_at, n.style
            FROM "note_access" na
            JOIN "note" n ON n.id = na.note_id
            WHERE na.user_id = ${userId}
            AND n.user_id != ${userId}
            AND n.generation_type = 'group'
            ORDER BY n.created_at DESC
        `;

        const allGroupNotes = [
            ...ownRows.filter(r => r.generation_type === 'group'),
            ...accessRows,
        ];

        const individual = ownRows.filter(r => r.generation_type === 'individual');

        return NextResponse.json({ group: allGroupNotes, individual });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}