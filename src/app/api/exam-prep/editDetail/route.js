import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { publicId, label } = await req.json();
        if (!publicId || !label?.trim()) return NextResponse.json({ error: 'Missing publicId or label.' }, { status: 400 });

        const [examPrep] = await sql`SELECT id FROM exam_prep WHERE public_id = ${publicId} AND user_id = ${userId}`;
        let id = examPrep?.id;

        if (!id) {
            const [access] = await sql`
                SELECT ep.id FROM exam_prep ep
                JOIN exam_prep_access epa ON epa.exam_prep_id = ep.id
                WHERE ep.public_id = ${publicId} AND epa.user_id = ${userId}
            `;
            if (!access) return NextResponse.json({ error: 'Not found or not authorized.' }, { status: 404 });
            id = access.id;
        }

        await sql`UPDATE exam_prep SET label = ${label.trim()} WHERE id = ${id}`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}