import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { requireAdmin } from "../_lib/requireAdmin";

// Helper to format large numbers (e.g., 1500000 -> 1.5M)
function fmtNum(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

// Helper to format seconds into hours/mins
function fmtDuration(seconds) {
  if (!seconds) return '0 mins';
  const hours = seconds / 3600;
  if (hours >= 1) return `${hours.toFixed(1)} hrs`;
  return `${Math.ceil(seconds / 60)} mins`;
}

export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? '30D';
  const intervalMap = { '7D': '7 days', '30D': '30 days', '90D': '90 days', 'all': '100 years' };
  const interval = intervalMap[period] ?? '30 days';

  const [
    metricsRows,
    activeRows,
    revenueRows,
    pendingCountRows,
    usageRows,
    revBreakdownRows,
    circulationRows,
    allTimeRows,
    recentActivityRows,
    pendingQueueRows,
    
    // Detailed stats queries
    noteStats, 
    examPrepStats, 
    audioConvertStats, 
    transcriptStats
  ] = await Promise.all([

    sql`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS new_this_month
      FROM "user"
    `,

    sql`
      SELECT COUNT(DISTINCT user_id)::int AS active_week
      FROM (
        SELECT user_id FROM activity WHERE date >= NOW() - INTERVAL '7 days'
        UNION
        SELECT user_id FROM audio_converter_logs WHERE created_at >= NOW() - INTERVAL '7 days'
      ) active_users
    `,

    sql`
      SELECT COALESCE(SUM(charge_amount), 0)::numeric AS revenue
      FROM activity
      WHERE type != 'topup'
        AND date >= NOW() - ${interval}::interval
    `,

    sql`
      SELECT COUNT(*)::int AS pending
      FROM pending_topups WHERE status = 'pending'
    `,

    sql`
      SELECT type, COUNT(*)::int AS count
      FROM activity
      WHERE type IN ('note', 'transcript', 'exam_prep')
        AND date >= NOW() - ${interval}::interval
      GROUP BY type
      UNION ALL
      SELECT 'audio_convert' AS type, COUNT(*)::int AS count
      FROM audio_converter_logs
      WHERE created_at >= NOW() - ${interval}::interval
    `,

    sql`
      SELECT type, COALESCE(SUM(charge_amount), 0)::numeric AS total
      FROM activity
      WHERE type IN ('note', 'transcript', 'exam_prep')
        AND date >= date_trunc('month', NOW())
      GROUP BY type
    `,

    sql`SELECT COALESCE(SUM(balance), 0)::numeric AS circulation FROM "user"`,

    sql`
      SELECT COALESCE(SUM(charge_amount), 0)::numeric AS total
      FROM activity WHERE type = 'topup'
    `,

    sql`
      SELECT * FROM (
        SELECT
          a.id::text, a.type, a.title, a.charge_amount, a.status, a.date,
          u.username
        FROM activity a
        JOIN "user" u ON u.id = a.user_id
        
        UNION ALL
        
        SELECT
          acl.id::text, 'audio_convert' AS type, 'Audio Conversion' AS title, 0 AS charge_amount, 'completed' AS status, acl.created_at AS date,
          u.username
        FROM audio_converter_logs acl
        JOIN "user" u ON u.id = acl.user_id
      ) combined
      ORDER BY date DESC
      LIMIT 10
    `,

    sql`
      SELECT
        pt.id, pt.amount, pt.reference_id, pt.verified_by, pt.created_at,
        u.id AS user_id, u.username
      FROM pending_topups pt
      JOIN "user" u ON u.id = pt.user_id
      WHERE pt.status = 'pending'
      ORDER BY pt.created_at DESC
      LIMIT 5
    `,

    sql`
      SELECT 
        COALESCE(SUM(input_tokens), 0)::int AS in_tok, 
        COALESCE(SUM(output_tokens), 0)::int AS out_tok 
      FROM "note" 
      WHERE created_at >= NOW() - ${interval}::interval
    `,
    
    sql`
      SELECT 
        COALESCE(SUM(input_tokens), 0)::int AS in_tok, 
        COALESCE(SUM(output_tokens), 0)::int AS out_tok 
      FROM exam_prep 
      WHERE created_at >= NOW() - ${interval}::interval
    `,
    
    sql`
      SELECT 
        COALESCE(SUM(duration_seconds), 0)::int AS seconds 
      FROM audio_converter_logs 
      WHERE created_at >= NOW() - ${interval}::interval
    `,
    
    sql`
      SELECT 
        COALESCE(SUM(duration), 0)::int AS seconds 
      FROM transcript 
      WHERE created_at >= NOW() - ${interval}::interval
    `,
  ]);

  const metrics = metricsRows[0] ?? {};
  const active  = activeRows[0]  ?? {};
  const revenue = revenueRows[0] ?? {};
  const pending = pendingCountRows[0] ?? {};
  const circ    = circulationRows[0] ?? {};
  const allTime = allTimeRows[0] ?? {};

  const nStats  = noteStats[0] ?? {};
  const epStats = examPrepStats[0] ?? {};
  const acStats = audioConvertStats[0] ?? {};
  const tStats  = transcriptStats[0] ?? {};

  const usageMap = {};
  usageRows.forEach(r => { usageMap[r.type] = Number(r.count); });
  const maxUsage = Math.max(...Object.values(usageMap), 1);

  const revMap = {};
  revBreakdownRows.forEach(r => { revMap[r.type] = parseFloat(r.total); });

  const SERVICE_LABELS = {
    note:          'Inclass Notes',
    transcript:    'Transcriptor',
    exam_prep:     'Exam Prep',
    audio_convert: 'Audio Converter',
  };

  const detailsMap = {
    note:          `${fmtNum(nStats.in_tok)} in / ${fmtNum(nStats.out_tok)} out`,
    exam_prep:     `${fmtNum(epStats.in_tok)} in / ${fmtNum(epStats.out_tok)} out`,
    audio_convert: `${fmtDuration(acStats.seconds)} processed`,
    transcript:    `${fmtDuration(tStats.seconds)} transcribed`,
  };

  return NextResponse.json({
    metrics: {
      totalUsers:       metrics.total_users    ?? 0,
      newThisMonth:     metrics.new_this_month ?? 0,
      activeThisWeek:   active.active_week     ?? 0,
      revenueThisMonth: parseFloat(revenue.revenue ?? 0),
      pendingTopups:    pending.pending         ?? 0,
    },
    serviceUsage: ['note', 'transcript', 'exam_prep', 'audio_convert'].map(type => ({
      service: type,
      label:   SERVICE_LABELS[type],
      count:   usageMap[type] ?? 0,
      pct:     Math.round(((usageMap[type] ?? 0) / maxUsage) * 100),
      detail:  detailsMap[type] ?? '',
    })),
    revenue: {
      notes:         revMap.note       ?? 0,
      transcript:    revMap.transcript  ?? 0,
      examPrep:      revMap.exam_prep   ?? 0,
      total:         parseFloat(revenue.revenue ?? 0),
      circulation:   parseFloat(circ.circulation ?? 0),
      allTimeTopups: parseFloat(allTime.total ?? 0),
    },
    recentActivity: recentActivityRows.map(a => ({
      id:           a.id,
      type:         a.type,
      title:        a.title,
      username:     a.username,
      chargeAmount: parseFloat(a.charge_amount ?? 0),
      status:       a.status,
      createdAt:    a.date,
    })),
    pendingQueue: pendingQueueRows.map(pt => ({
      id:        pt.id,
      userId:    pt.user_id,
      username:  pt.username,
      amount:    parseFloat(pt.amount),
      ref:       pt.reference_id,
      verifiedBy: pt.verified_by,
      createdAt: pt.created_at,
    })),
  });
}