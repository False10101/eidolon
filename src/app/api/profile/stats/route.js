import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

const PERIOD_MAP = { '1W': 7, '1M': 30, '6M': 180, '1Y': 365 };

export async function GET(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const days = PERIOD_MAP[searchParams.get('period')] ?? 180;

        const [noteStats] = await sql`
            SELECT COUNT(*) as notes
            FROM "note"
            WHERE user_id = ${userId}
            AND created_at >= NOW() - INTERVAL '1 day' * ${days}
        `;

        const [txStats] = await sql`
            SELECT COUNT(*) as transcriptions,
                   COALESCE(SUM(duration), 0) as total_seconds
            FROM "transcript"
            WHERE user_id = ${userId}
            AND created_at >= NOW() - INTERVAL '1 day' * ${days}
        `;

        const [tokenStats] = await sql`
            SELECT 
                COALESCE((SELECT SUM(total_tokens) FROM "note" WHERE user_id = ${userId} AND created_at >= NOW() - INTERVAL '1 day' * ${days}), 0) +
                COALESCE((SELECT SUM(total_tokens) FROM "exam_prep" WHERE user_id = ${userId} AND created_at >= NOW() - INTERVAL '1 day' * ${days}), 0)
            AS tokens
        `;

        const [spendStats] = await sql`
            SELECT COALESCE(SUM(charge_amount), 0) as total_spent
            FROM "activity"
            WHERE user_id = ${userId}
            AND date >= NOW() - INTERVAL '1 day' * ${days}
        `;

        return NextResponse.json({
            stats: {
                notes: parseInt(noteStats.notes),
                transcriptions: parseInt(txStats.transcriptions),
                audio_hours: (parseInt(txStats.total_seconds) / 3600).toFixed(1),
                tokens: formatTokens(parseInt(tokenStats.tokens)),
                total_spent: parseFloat(spendStats.total_spent),
            }
        });
    } catch (error) {
        console.error("GET /profile/stats error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

function formatTokens(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}