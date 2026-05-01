import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { requireAdmin } from "../../_lib/requireAdmin";

// Mistral rates (per token)
const MISTRAL_IN  = 0.30 / 1_000_000;
const MISTRAL_OUT = 1.20 / 1_000_000;

// DeepInfra Whisper rates (per minute)
const WHISPER_TURBO = 0.00020;
const WHISPER_LARGE = 0.00045;

function noteProfit(inputTokens, outputTokens, chargeCredits) {
  const revenue = chargeCredits / 100;
  const cost    = inputTokens * MISTRAL_IN + outputTokens * MISTRAL_OUT;
  return revenue - cost;
}

function transcriptProfit(durationSeconds, model, chargeCredits) {
  const revenue = chargeCredits / 100;
  const rate    = model?.includes('turbo') ? WHISPER_TURBO : WHISPER_LARGE;
  const cost    = (durationSeconds / 60) * rate;
  return revenue - cost;
}

export async function GET(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const userId = parseInt(params.id);
  if (!userId) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

  const [[user], activityRows, noteRows, examRows, transcriptRows, referrerRows] = await Promise.all([
    // User profile + referral info
    sql`
      SELECT u.id, u.username, u.email, u.balance, u.created_at, u.last_login,
             u.referral_code, u.referred_by,
             r.username AS referrer_username, r.email AS referrer_email
      FROM "user" u
      LEFT JOIN "user" r ON r.id = u.referred_by
      WHERE u.id = ${userId}
    `,

    // Full activity log
    sql`
      SELECT id, type, title, charge_amount, balance_after, status, date, ref
      FROM activity
      WHERE user_id = ${userId}
      ORDER BY date DESC
      LIMIT 500
    `,

    // Individual note gens for this user (need tokens for cost calc)
    sql`
      SELECT n.id, n.input_tokens, n.output_tokens, n.charge_amount, n.generation_type, n.created_at
      FROM note n
      WHERE n.user_id = ${userId}
        AND n.status = 'completed'
        AND n.is_trial = false
    `,

    // Exam prep gens for this user
    sql`
      SELECT e.id, e.input_tokens, e.output_tokens, e.charge_amount, e.created_at
      FROM exam_prep e
      WHERE e.user_id = ${userId}
        AND e.status = 'Completed'
    `,

    // Transcripts for this user
    sql`
      SELECT t.id, t.duration, t.model, t.charge_amount, t.created_at
      FROM transcript t
      WHERE t.user_id = ${userId}
        AND t.status = 'Completed'
    `,

    // Users this person referred
    sql`
      SELECT id, username, email, created_at
      FROM "user"
      WHERE referred_by = ${userId}
    `,
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // ── Per-service profit breakdown ────────────────────────────────────────────

  // Group gens: need member count at gen time to split api cost
  // For group notes: find all note_access rows to get N members at gen time
  const groupNoteIds = noteRows.filter(n => n.generation_type === 'group').map(n => n.id);
  const groupExamIds = examRows.map(e => e.id); // exam_prep doesn't store generation_type in query above, get all

  // Get group member counts for group notes
  let groupNoteMemberCounts = {};
  if (groupNoteIds.length > 0) {
    const counts = await sql`
      SELECT note_id, COUNT(*)::int AS member_count
      FROM note_access
      WHERE note_id = ANY(${groupNoteIds})
        AND is_original = 1
      GROUP BY note_id
    `;
    counts.forEach(r => { groupNoteMemberCounts[r.note_id] = r.member_count; });
  }

  // Get which exam_preps were group gens and their member counts
  let groupExamMemberCounts = {};
  if (groupExamIds.length > 0) {
    const counts = await sql`
      SELECT exam_prep_id, COUNT(*)::int AS member_count
      FROM exam_prep_access
      WHERE exam_prep_id = ANY(${groupExamIds})
        AND is_original = 1
      GROUP BY exam_prep_id
    `;
    counts.forEach(r => { groupExamMemberCounts[r.exam_prep_id] = r.member_count; });
  }

  // Notes profit
  let notesRevenue = 0, notesCost = 0, notesCount = 0;
  for (const n of noteRows) {
    const isGroup = n.generation_type === 'group';
    const N = isGroup ? (groupNoteMemberCounts[n.id] ?? 1) : 1;
    const apiCost = (n.input_tokens * MISTRAL_IN + n.output_tokens * MISTRAL_OUT);
    const userApiCost = apiCost / N;
    // For group gens, charge_amount on note is the TOTAL finalPrice; user's activity has their split
    // We use the note's full charge if individual, proportional if group handled via activity
    const revenue = parseFloat(n.charge_amount) / (isGroup ? N : 1) / 100;
    notesRevenue += revenue;
    notesCost    += userApiCost;
    notesCount   += 1;
  }

  // Exam profit
  let examRevenue = 0, examCost = 0, examCount = 0;
  for (const e of examRows) {
    const isGroup = groupExamMemberCounts[e.id] !== undefined;
    const N = isGroup ? (groupExamMemberCounts[e.id] ?? 1) : 1;
    const apiCost = (e.input_tokens * MISTRAL_IN + e.output_tokens * MISTRAL_OUT);
    const userApiCost = apiCost / N;
    const revenue = parseFloat(e.charge_amount) / (isGroup ? N : 1) / 100;
    examRevenue += revenue;
    examCost    += userApiCost;
    examCount   += 1;
  }

  // Transcript profit
  let transcriptRevenue = 0, transcriptCost = 0, transcriptCount = 0;
  for (const t of transcriptRows) {
    const rate = t.model?.includes('turbo') ? WHISPER_TURBO : WHISPER_LARGE;
    const cost = (parseFloat(t.duration) / 60) * rate;
    const revenue = parseFloat(t.charge_amount) / 100;
    transcriptRevenue += revenue;
    transcriptCost    += cost;
    transcriptCount   += 1;
  }

  const totalRevenue = notesRevenue + examRevenue + transcriptRevenue;
  const totalCost    = notesCost    + examCost    + transcriptCost;
  const totalProfit  = totalRevenue - totalCost;

  return NextResponse.json({
    user: {
      id:               user.id,
      username:         user.username,
      email:            user.email,
      balance:          parseFloat(user.balance ?? 0),
      createdAt:        user.created_at,
      lastLogin:        user.last_login,
      referralCode:     user.referral_code,
      referredBy:       user.referred_by,
      referrerUsername: user.referrer_username ?? null,
      referrerEmail:    user.referrer_email    ?? null,
    },
    profit: {
      total:   totalProfit,
      revenue: totalRevenue,
      cost:    totalCost,
      breakdown: {
        notes:       { revenue: notesRevenue,      cost: notesCost,      profit: notesRevenue - notesCost,           count: notesCount },
        exam:        { revenue: examRevenue,        cost: examCost,       profit: examRevenue  - examCost,            count: examCount  },
        transcripts: { revenue: transcriptRevenue, cost: transcriptCost, profit: transcriptRevenue - transcriptCost, count: transcriptCount },
      },
    },
    referrals: referrerRows.map(r => ({
      id:        r.id,
      username:  r.username,
      email:     r.email,
      createdAt: r.created_at,
    })),
    activity: activityRows.map(a => ({
      id:           a.id,
      type:         a.type,
      title:        a.title,
      chargeAmount: parseFloat(a.charge_amount ?? 0),
      balanceAfter: parseFloat(a.balance_after ?? 0),
      status:       a.status,
      createdAt:    a.date,
      ref:          a.ref ?? null,
    })),
  });
}
