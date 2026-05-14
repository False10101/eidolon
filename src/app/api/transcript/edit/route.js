import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function PATCH(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { publicId, label, content, clearSegments } = await req.json();
        if (!publicId) return NextResponse.json({ error: 'publicId is required.' }, { status: 400 });

        const [transcript] = await sql`
            SELECT id FROM transcript WHERE public_id = ${publicId} AND user_id = ${userId}
        `;
        if (!transcript) return NextResponse.json({ error: 'Not found or not authorized.' }, { status: 404 });

        if (clearSegments) {
            await sql`
                UPDATE transcript
                SET label = ${label}, content = ${content}, segments = NULL, output_format = 'text'
                WHERE id = ${transcript.id}
            `;
        } else {
            await sql`
                UPDATE transcript SET label = ${label}, content = ${content} WHERE id = ${transcript.id}
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
