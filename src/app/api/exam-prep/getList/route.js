import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [membership] = await sql`
            SELECT group_id FROM "group_member" WHERE user_id = ${userId} LIMIT 1
        `;

        const individual = await sql`
            SELECT label, public_id, difficulty, question_type, created_at, charge_amount, total_tokens, status, unlock_price
            FROM exam_prep
            WHERE user_id = ${userId}
            AND generation_type = 'individual'
            ORDER BY created_at DESC
        `;

        let group = [];
        if (membership) {
            group = await sql`
                SELECT 
                    ep.label, ep.public_id, ep.difficulty, ep.question_type,
                    ep.created_at, ep.charge_amount, ep.total_tokens, ep.status, ep.unlock_price,
                    (
                        ep.user_id = ${userId} OR
                        EXISTS (
                            SELECT 1 FROM exam_prep_access epa
                            WHERE epa.exam_prep_id = ep.id AND epa.user_id = ${userId}
                        )
                    ) AS is_unlocked
                FROM exam_prep ep
                WHERE ep.group_id = ${membership.group_id} 
                AND ep.generation_type = 'group'
                AND ep.status = 'Completed'
                ORDER BY ep.created_at DESC
            `;
        }

        return NextResponse.json({ individual, group });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}