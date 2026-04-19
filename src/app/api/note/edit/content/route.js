import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function PATCH(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { content, publicId, name, topic, instructor } = await req.json();

        const [note] = await sql`SELECT id FROM "note" WHERE public_id = ${publicId} AND user_id = ${userId}`;
        let id = note?.id;

        if (!id) {
            const [access] = await sql`
                SELECT n.id FROM "note" n
                JOIN "note_access" na ON na.note_id = n.id
                WHERE n.public_id = ${publicId} AND na.user_id = ${userId}
            `;
            if (!access) return NextResponse.json({ error: 'Not found or not authorized.' }, { status: 404 });
            id = access.id;
        }

        await sql`UPDATE "note" SET content = ${content}, name = ${name}, lecture_topic = ${topic}, instructor = ${instructor} WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}