import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [membership] = await sql`
            SELECT group_id FROM "group_member" WHERE user_id = ${userId} LIMIT 1
        `;

        const individual = await sql`
            SELECT 
                t.label, t.filename, t.public_id, t.duration, t.created_at, t.charge_amount, t.status, t.is_trial, t.generation_type,
                (t.is_trial AND NOT EXISTS (
                    SELECT 1 FROM note n
                    WHERE n.transcript_id = t.id
                      AND n.status IN ('pending', 'reading', 'generating', 'saving', 'completed')
                )) AS free_note_available,
                true AS is_unlocked
            FROM "transcript" t
            WHERE t.user_id = ${userId}
            AND (t.generation_type = 'individual' OR t.generation_type IS NULL)
            ORDER BY t.created_at DESC
        `;

        let group = [];
        if (membership) {
            group = await sql`
                SELECT 
                    t.label, t.filename, t.public_id, t.duration,
                    t.created_at, t.unlock_price, t.charge_amount, t.status, t.is_trial, t.generation_type,
                    (t.is_trial AND NOT EXISTS (
                        SELECT 1 FROM note n
                        WHERE n.transcript_id = t.id
                          AND n.status IN ('pending', 'reading', 'generating', 'saving', 'completed')
                    )) AS free_note_available,
                    true AS is_unlocked
                FROM transcript t
                JOIN transcript_access ta ON ta.transcript_id = t.id
                WHERE t.group_id = ${membership.group_id}
                AND t.generation_type = 'group'
                AND ta.user_id = ${userId}
                ORDER BY t.created_at DESC
            `;
        }

        const combined = [...individual, ...group].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return NextResponse.json(combined);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
