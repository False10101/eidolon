import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [user] = await sql`
            SELECT username, balance, last_login, avatar_url, free_generations_remaining
            FROM "user" WHERE id = ${userId}
        `;

        const activity = await sql`
            SELECT 
                a.id,
                a.type,
                CASE
                    WHEN a.type = 'note' AND a.title = 'Unlocked group note' THEN CONCAT('Unlocked note: ', COALESCE(n.name, a.title))
                    WHEN a.type = 'exam_prep' AND a.title = 'Unlocked group exam prep' THEN CONCAT('Unlocked exam prep: ', COALESCE(e.label, a.title))
                    WHEN a.type = 'rebate' AND a.title = 'Group note unlocked by new member' THEN CONCAT('Unlock rebate: ', COALESCE(rebate_note.name, a.title))
                    WHEN a.type = 'rebate' AND a.title = 'Group exam prep unlocked by new member' THEN CONCAT('Unlock rebate: ', COALESCE(rebate_exam.label, a.title))
                    ELSE a.title
                END AS title,
                a.status, a.date, a.charge_amount, a.balance_after,
                COALESCE(n.public_id, e.public_id, t.public_id) as public_id
            FROM "activity" a
            LEFT JOIN "note" n ON n.id = a.respective_table_id AND a.type = 'note'
            LEFT JOIN "exam_prep" e ON e.id = a.respective_table_id AND a.type = 'exam_prep'
            LEFT JOIN "note" rebate_note ON rebate_note.id = a.respective_table_id AND a.type = 'rebate' AND a.title = 'Group note unlocked by new member'
            LEFT JOIN "exam_prep" rebate_exam ON rebate_exam.id = a.respective_table_id AND a.type = 'rebate' AND a.title = 'Group exam prep unlocked by new member'
            LEFT JOIN "transcript" t ON t.id = a.respective_table_id AND a.type = 'transcript'
            WHERE a.user_id = ${userId}
            ORDER BY a.date DESC
            LIMIT 50
        `;

        const tokenTotals = await sql`
            SELECT
                COALESCE(SUM(n.input_tokens), 0) + COALESCE(SUM(e.input_tokens), 0) as total_input,
                COALESCE(SUM(n.output_tokens), 0) + COALESCE(SUM(e.output_tokens), 0) as total_output
            FROM "activity" a
            LEFT JOIN "note" n ON n.id = a.respective_table_id AND a.type = 'note'
            LEFT JOIN "exam_prep" e ON e.id = a.respective_table_id AND a.type = 'exam_prep'
            WHERE a.user_id = ${userId}
            AND a.type IN ('note', 'exam_prep')
        `;

        const [costRow] = await sql`
            SELECT COALESCE(SUM(charge_amount), 0) as total_cost
            FROM "activity"
            WHERE user_id = ${userId}
            AND type != 'topup'
        `;

        const monthlyUsage = await sql`
            SELECT type, COUNT(*) as "totalUsage"
            FROM "activity"
            WHERE user_id = ${userId}
            AND date >= date_trunc('month', NOW())
            AND type != 'topup'
            GROUP BY type
            ORDER BY "totalUsage" DESC
        `;

        return NextResponse.json({
            userData: {
                username: user.username,
                balance: user.balance,
                free_generations_remaining: user.free_generations_remaining,
                last_login: user.last_login,
                avatar_url: user.avatar_url,
                totalTokenSent: tokenTotals[0].total_input,
                totalTokenReceived: tokenTotals[0].total_output,
                totalCost: costRow.total_cost,
                activity,
                monthlyUsage,
            }
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
