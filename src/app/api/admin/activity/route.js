import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { requireAdmin } from "../_lib/requireAdmin";

// FIX 1: Renamed from GET_activity to GET
export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
 
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? '30D';
  const intervalMap = { '7D': '7 days', '30D': '30 days', '90D': '90 days', 'all': '100 years' };
  const interval = intervalMap[period] ?? '30 days';
 
  const [activityRows, chartRows, statsRows] = await Promise.all([
    sql`
      SELECT
        a.id, a.type, a.title, a.charge_amount, a.status, a.date,
        u.username
      FROM activity a
      JOIN "user" u ON u.id = a.user_id
      -- FIX 2: Cast to interval
      WHERE a.date >= NOW() - ${interval}::interval
      ORDER BY a.date DESC
      LIMIT 200
    `,
    sql`
      SELECT
        DATE_TRUNC('day', date)::date                      AS day,
        COUNT(*) FILTER (WHERE type = 'note')::int         AS notes,
        COUNT(*) FILTER (WHERE type = 'transcript')::int   AS transcripts,
        COUNT(*) FILTER (WHERE type = 'exam_prep')::int    AS exam_prep
      FROM activity
      -- FIX 2: Cast to interval
      WHERE date >= NOW() - ${interval}::interval
        AND type IN ('note', 'transcript', 'exam_prep')
      GROUP BY DATE_TRUNC('day', date)
      ORDER BY day ASC
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE type = 'note')::int         AS notes,
        COUNT(*) FILTER (WHERE type = 'transcript')::int   AS transcripts,
        COUNT(*) FILTER (WHERE type = 'exam_prep')::int    AS exam_prep
      FROM activity
      -- FIX 2: Cast to interval
      WHERE date >= NOW() - ${interval}::interval
    `,
  ]);
 
  const stats = statsRows[0] ?? {};
 
  return NextResponse.json({
    activity: activityRows.map(a => ({
      id:           a.id,
      type:         a.type,
      title:        a.title,
      username:     a.username,
      chargeAmount: parseFloat(a.charge_amount ?? 0),
      status:       a.status,
      createdAt:    a.date,
    })),
    chartData: chartRows.map(row => ({
      day:         row.day,
      notes:       Number(row.notes       ?? 0),
      transcripts: Number(row.transcripts ?? 0),
      examPrep:    Number(row.exam_prep   ?? 0),
    })),
    stats: {
      notes:       Number(stats.notes       ?? 0),
      transcripts: Number(stats.transcripts ?? 0),
      examPrep:    Number(stats.exam_prep   ?? 0),
    },
  });
}