import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { requireAdmin } from "../_lib/requireAdmin";

function fmtNum(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

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
    bankInflowRows,
    featureRevenueRows,
    rebateRows,
    usageRows,
    noteTokens,
    examTokens,
    transcriptData,
    recentActivityRows
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS new_month FROM "user"`,
    sql`SELECT COUNT(DISTINCT user_id)::int AS active_week FROM (SELECT user_id FROM activity WHERE date >= NOW() - INTERVAL '7 days' UNION SELECT user_id FROM audio_converter_logs WHERE created_at >= NOW() - INTERVAL '7 days') a`,
    sql`SELECT COALESCE(SUM(charge_amount), 0)::numeric AS total FROM activity WHERE type = 'topup' AND date >= date_trunc('month', NOW())`,
    sql`SELECT type, COALESCE(SUM(charge_amount), 0)::numeric AS total_credits FROM activity WHERE type IN ('note', 'transcript', 'exam_prep') AND date >= NOW() - ${interval}::interval GROUP BY type`,
    sql`SELECT COALESCE(SUM(charge_amount), 0)::numeric AS total_payouts FROM activity WHERE type = 'rebate' AND date >= date_trunc('month', NOW())`,
    sql`SELECT type, COUNT(*)::int AS count FROM activity WHERE type IN ('note', 'transcript', 'exam_prep') AND date >= NOW() - ${interval}::interval GROUP BY type UNION ALL SELECT 'audio_convert' AS type, COUNT(*)::int AS count FROM audio_converter_logs WHERE created_at >= NOW() - ${interval}::interval`,
    sql`SELECT COALESCE(SUM(input_tokens), 0)::numeric AS input, COALESCE(SUM(output_tokens), 0)::numeric AS output FROM "note" WHERE status = 'completed' AND created_at >= NOW() - ${interval}::interval`,
    sql`SELECT COALESCE(SUM(input_tokens), 0)::numeric AS input, COALESCE(SUM(output_tokens), 0)::numeric AS output FROM exam_prep WHERE status = 'Completed' AND created_at >= NOW() - ${interval}::interval`,
    sql`SELECT model, COALESCE(SUM(duration), 0)::numeric AS total_seconds FROM transcript WHERE status = 'Completed' AND created_at >= NOW() - ${interval}::interval GROUP BY model`,
    sql`SELECT a.type, a.charge_amount, a.status, a.date, u.username FROM activity a JOIN "user" u ON u.id = a.user_id ORDER BY a.date DESC LIMIT 15`,
  ]);

  // --- 1. REVENUE (In USD) ---
  const revMap = {};
  featureRevenueRows.forEach(r => { revMap[r.type] = parseFloat(r.total_credits) / 100; });
  const totalUsageRevenue = (revMap.note ?? 0) + (revMap.transcript ?? 0) + (revMap.exam_prep ?? 0);

  // --- 2. COSTS ---
  const nStats = noteTokens[0] || {input:0, output:0};
  const epStats = examTokens[0] || {input:0, output:0};
  const noteCost = ((nStats.input * 0.30) / 1000000) + ((nStats.output * 1.20) / 1000000);
  const examCost = ((epStats.input * 0.30) / 1000000) + ((epStats.output * 1.20) / 1000000);
  
  let transcriptCost = 0;
  transcriptData.forEach(r => {
    const rate = r.model?.includes('turbo') ? 0.0009 : 0.0015;
    transcriptCost += (r.total_seconds / 60) * rate;
  });

  // --- 3. REBATE PROFIT (The 30% Platform Tax) ---
  const totalPayoutsSent = parseFloat(rebateRows[0]?.total_payouts || 0);
  const platformTaxCredits = (totalPayoutsSent / 0.7) * 0.3;
  const platformTaxUSD = platformTaxCredits / 100;

  // --- 4. FINAL PROFIT ---
  const totalProfit = (totalUsageRevenue - (noteCost + examCost + transcriptCost)) + platformTaxUSD;

  // --- 5. SERVICE USAGE DATA (THE FIX) ---
  const usageMap = {};
  usageRows.forEach(r => { usageMap[r.type] = Number(r.count); });
  const maxUsage = Math.max(...Object.values(usageMap), 1);
  const SERVICE_LABELS = { note: 'Inclass Notes', transcript: 'Transcriptor', exam_prep: 'Exam Prep', audio_convert: 'Audio Converter' };
  const detailsMap = {
    note: `${fmtNum(nStats.input)} in / ${fmtNum(nStats.output)} out`,
    exam_prep: `${fmtNum(epStats.input)} in / ${fmtNum(epStats.output)} out`,
    audio_convert: `Converter active`, // Placeholder
    transcript: `Processing audio`, // Placeholder
  };

  return NextResponse.json({
    metrics: {
      totalUsers: metricsRows[0].total,
      newThisMonth: metricsRows[0].new_month,
      activeThisWeek: activeRows[0].active_week,
      bankInflow: parseFloat(bankInflowRows[0].total) / 100,
      totalProfit: totalProfit,
    },
    // RESTORED THIS KEY:
    serviceUsage: ['note', 'transcript', 'exam_prep', 'audio_convert'].map(type => ({
      service: type,
      label:   SERVICE_LABELS[type],
      count:   usageMap[type] ?? 0,
      pct:     Math.round(((usageMap[type] ?? 0) / maxUsage) * 100),
      detail:  detailsMap[type] ?? '',
    })),
    revenue: {
      note: { rev: revMap.note ?? 0, cost: noteCost, profit: (revMap.note ?? 0) - noteCost },
      exam: { rev: revMap.exam_prep ?? 0, cost: examCost, profit: (revMap.exam_prep ?? 0) - examCost },
      transcript: { rev: revMap.transcript ?? 0, cost: transcriptCost, profit: (revMap.transcript ?? 0) - transcriptCost },
      platformTax: platformTaxUSD,
      totalCost: noteCost + examCost + transcriptCost,
    },
    recentActivity: recentActivityRows.map(a => ({
      type: a.type,
      username: a.username,
      chargeAmount: parseFloat(a.charge_amount),
      status: a.status,
      createdAt: a.date
    }))
  });
}