import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function DELETE(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { publicId } = await req.json();
        if (!publicId) return NextResponse.json({ error: "Missing publicId." }, { status: 400 });

        const [transcript] = await sql`
            SELECT id FROM "transcript"
            WHERE public_id = ${publicId} AND user_id = ${userId}
        `;

        if (!transcript) return NextResponse.json({ error: "Transcript not found." }, { status: 404 });

        await sql.begin(async (tx) => {
            await tx`UPDATE "note" SET transcript_id = NULL WHERE transcript_id = ${transcript.id}`;
            await tx`DELETE FROM "transcript" WHERE id = ${transcript.id}`;
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE /transcript/delete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}