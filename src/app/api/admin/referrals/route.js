import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { requireAdmin } from "../_lib/requireAdmin";

const MISTRAL_IN    = 0.30 / 1_000_000;
const MISTRAL_OUT   = 1.20 / 1_000_000;
const WHISPER_TURBO = 0.00020;
const WHISPER_LARGE = 0.00045;

const INTERVAL_MAP = { '7D': '7 days', '30D': '30 days', '90D': '90 days', 'all': '100 years' };

function calcProfit(noteRows, examRows, transcriptRows, groupNoteMemberCounts, groupExamMemberCounts, referredIds, fromDate = null) {
  const profitByUser = {};
  for (const id of referredIds) profitByUser[id] = 0;

  for (const n of noteRows) {
    if (fromDate && new Date(n.created_at) < fromDate) continue;
    const isGroup = n.generation_type === 'group';
    const N       = isGroup ? (groupNoteMemberCounts[n.id] ?? 1) : 1;
    const apiCost = (n.input_tokens * MISTRAL_IN + n.output_tokens * MISTRAL_OUT) / N;
    const revenue = parseFloat(n.charge_amount) / (isGroup ? N : 1) / 100;
    profitByUser[n.user_id] = (profitByUser[n.user_id] ?? 0) + (revenue - apiCost);
  }

  for (const e of examRows) {
    if (fromDate && new Date(e.created_at) < fromDate) continue;
    const isGroup = groupExamMemberCounts[e.id] !== undefined;
    const N       = isGroup ? (groupExamMemberCounts[e.id] ?? 1) : 1;
    const apiCost = (e.input_tokens * MISTRAL_IN + e.output_tokens * MISTRAL_OUT) / N;
    const revenue = parseFloat(e.charge_amount) / (isGroup ? N : 1) / 100;
    profitByUser[e.user_id] = (profitByUser[e.user_id] ?? 0) + (revenue - apiCost);
  }

  for (const t of transcriptRows) {
    if (fromDate && new Date(t.created_at) < fromDate) continue;
    const rate    = t.model?.includes('turbo') ? WHISPER_TURBO : WHISPER_LARGE;
    const cost    = (parseFloat(t.duration) / 60) * rate;
    const revenue = parseFloat(t.charge_amount) / 100;
    profitByUser[t.user_id] = (profitByUser[t.user_id] ?? 0) + (revenue - cost);
  }

  return profitByUser;
}

export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period   = searchParams.get('period') ?? 'unpaid';
  const isUnpaid = period === 'unpaid';
  const interval = INTERVAL_MAP[period] ?? null;

  // Referrers with their last payout date
  const referredUsers = await sql`
    SELECT u.id AS user_id, u.username, u.email, u.referred_by,
           r.id AS referrer_id, r.username AS referrer_username,
           r.email AS referrer_email, r.referral_code,
           r.referral_last_paid_at
    FROM "user" u
    JOIN "user" r ON r.id = u.referred_by
  `;

  if (referredUsers.length === 0) return NextResponse.json({ referrers: [], period });

  const referredIds = referredUsers.map(u => u.user_id);

  // For unpaid mode we fetch all data and filter in JS per-referrer.
  // For period mode we push the date filter to SQL for efficiency.
  const [noteRows, examRows, transcriptRows, noteAccessCounts, examAccessCounts] = await Promise.all([
    isUnpaid
      ? sql`
          SELECT n.id, n.user_id, n.input_tokens, n.output_tokens,
                 n.charge_amount, n.generation_type, n.created_at
          FROM note n
          WHERE n.user_id = ANY(${referredIds})
            AND n.status = 'completed' AND n.is_trial = false`
      : sql`
          SELECT n.id, n.user_id, n.input_tokens, n.output_tokens,
                 n.charge_amount, n.generation_type, n.created_at
          FROM note n
          WHERE n.user_id = ANY(${referredIds})
            AND n.status = 'completed' AND n.is_trial = false
            AND n.created_at >= NOW() - ${interval}::interval`,

    isUnpaid
      ? sql`
          SELECT e.id, e.user_id, e.input_tokens, e.output_tokens,
                 e.charge_amount, e.created_at
          FROM exam_prep e
          WHERE e.user_id = ANY(${referredIds}) AND e.status = 'Completed'`
      : sql`
          SELECT e.id, e.user_id, e.input_tokens, e.output_tokens,
                 e.charge_amount, e.created_at
          FROM exam_prep e
          WHERE e.user_id = ANY(${referredIds}) AND e.status = 'Completed'
            AND e.created_at >= NOW() - ${interval}::interval`,

    isUnpaid
      ? sql`
          SELECT t.id, t.user_id, t.duration, t.model, t.charge_amount, t.created_at
          FROM transcript t
          WHERE t.user_id = ANY(${referredIds}) AND t.status = 'Completed'`
      : sql`
          SELECT t.id, t.user_id, t.duration, t.model, t.charge_amount, t.created_at
          FROM transcript t
          WHERE t.user_id = ANY(${referredIds}) AND t.status = 'Completed'
            AND t.created_at >= NOW() - ${interval}::interval`,

    sql`
      SELECT na.note_id, COUNT(*)::int AS member_count
      FROM note_access na
      JOIN note n ON n.id = na.note_id
      WHERE n.user_id = ANY(${referredIds})
        AND n.generation_type = 'group' AND na.is_original = 1
      GROUP BY na.note_id`,

    sql`
      SELECT epa.exam_prep_id, COUNT(*)::int AS member_count
      FROM exam_prep_access epa
      JOIN exam_prep e ON e.id = epa.exam_prep_id
      WHERE e.user_id = ANY(${referredIds}) AND epa.is_original = 1
      GROUP BY epa.exam_prep_id`,
  ]);

  const groupNoteMemberCounts = {};
  noteAccessCounts.forEach(r => { groupNoteMemberCounts[r.note_id] = r.member_count; });
  const groupExamMemberCounts = {};
  examAccessCounts.forEach(r => { groupExamMemberCounts[r.exam_prep_id] = r.member_count; });

  // Build referrer map first so we know each referrer's last_paid_at
  const referrerMeta = {};
  for (const u of referredUsers) {
    if (!referrerMeta[u.referrer_id]) {
      referrerMeta[u.referrer_id] = {
        referrerId:       u.referrer_id,
        referrerUsername: u.referrer_username,
        referrerEmail:    u.referrer_email,
        referralCode:     u.referral_code,
        lastPaidAt:       u.referral_last_paid_at ?? null,
        referredUserIds:  [],
      };
    }
    referrerMeta[u.referrer_id].referredUserIds.push(u.user_id);
  }

  // For each referrer compute profit (in unpaid mode, filtered from their last_paid_at)
  const referrers = Object.values(referrerMeta).map(r => {
    const fromDate = isUnpaid && r.lastPaidAt ? new Date(r.lastPaidAt) : null;

    const filteredNotes       = noteRows.filter(n => r.referredUserIds.includes(n.user_id));
    const filteredExams       = examRows.filter(e => r.referredUserIds.includes(e.user_id));
    const filteredTranscripts = transcriptRows.filter(t => r.referredUserIds.includes(t.user_id));

    const profitByUser = calcProfit(
      filteredNotes, filteredExams, filteredTranscripts,
      groupNoteMemberCounts, groupExamMemberCounts,
      r.referredUserIds, fromDate
    );

    const referredUsersData = referredUsers
      .filter(u => u.referrer_id === r.referrerId)
      .map(u => ({
        userId:   u.user_id,
        username: u.username,
        email:    u.email,
        profit:   profitByUser[u.user_id] ?? 0,
      }));

    const totalProfit = referredUsersData.reduce((s, u) => s + u.profit, 0);

    return {
      referrerId:       r.referrerId,
      referrerUsername: r.referrerUsername,
      referrerEmail:    r.referrerEmail,
      referralCode:     r.referralCode,
      lastPaidAt:       r.lastPaidAt,
      referredUsers:    referredUsersData,
      totalProfit,
      owedToReferrer:   totalProfit * 0.30,
    };
  });

  referrers.sort((a, b) => b.owedToReferrer - a.owedToReferrer);

  return NextResponse.json({ referrers, period });
}
