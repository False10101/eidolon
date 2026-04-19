import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req, { params }) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { publicId } = await params;

        // own note
        let rows = await sql`SELECT * FROM "note" WHERE user_id = ${userId} AND public_id = ${publicId}`;
        let detail = rows[0];

        // if not found, check if they have access via note_access
        if (!detail) {
            const accessRows = await sql`
                SELECT n.* FROM "note" n
                JOIN "note_access" na ON na.note_id = n.id
                WHERE na.user_id = ${userId} AND n.public_id = ${publicId}
            `;
            detail = accessRows[0];
        }

        if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (detail.transcript_id && !detail.uploaded_filename) {
            const transcriptRow = await sql`SELECT label from "transcript" WHERE id = ${detail.transcript_id}`

            if (transcriptRow[0]) {
                detail = { ...detail, transcriptName: transcriptRow[0].label };
            }
        }

        return NextResponse.json({ detail });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}