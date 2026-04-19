
import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
 
export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 
        const ownRows = await sql`
            SELECT label, public_id, difficulty, created_at, generation_type
            FROM exam_prep
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
        `;
 
        const accessRows = await sql`
            SELECT ep.label, ep.public_id, ep.difficulty, ep.created_at, ep.generation_type
            FROM exam_prep_access epa
            JOIN exam_prep ep ON ep.id = epa.exam_prep_id
            WHERE epa.user_id = ${userId}
            AND ep.user_id != ${userId}
            AND ep.generation_type = 'group'
            ORDER BY ep.created_at DESC
        `;
 
        const allGroup = [
            ...ownRows.filter(r => r.generation_type === 'group'),
            ...accessRows,
        ];
 
        const individual = ownRows.filter(r => r.generation_type === 'individual');
 
        return NextResponse.json({ individual, group: allGroup });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
 