import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { requireAdmin } from "../_lib/requireAdmin";

const MAX_ROWS = 300;
const VALID_TYPES = new Set(["all", "note", "transcript"]);
const VALID_MODES = new Set(["all", "individual", "group"]);

function numberOrZero(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatParticipant(participant) {
  return {
    userId: participant.userId,
    username: participant.username,
    email: participant.email,
    paidAmount: numberOrZero(participant.paidAmount),
    isOriginal: Boolean(participant.isOriginal),
    unlockedAt: participant.unlockedAt,
  };
}

function formatGeneration(row, resourceType) {
  const participants = Array.isArray(row.participants)
    ? row.participants.map(formatParticipant)
    : [];

  return {
    key: `${resourceType}-${row.id}`,
    id: row.id,
    publicId: row.public_id,
    resourceType,
    title: row.title,
    generationType: row.generation_type,
    status: row.status,
    createdAt: row.created_at,
    generator: {
      userId: row.generator_user_id,
      username: row.generator_username,
      email: row.generator_email,
    },
    group: row.group_id
      ? { id: row.group_id, name: row.group_name }
      : null,
    unlocks: {
      total: numberOrZero(row.unlock_count),
      original: numberOrZero(row.original_count),
      later: numberOrZero(row.later_count),
    },
    paid: {
      perPersonMin: row.per_person_min == null ? null : numberOrZero(row.per_person_min),
      perPersonMax: row.per_person_max == null ? null : numberOrZero(row.per_person_max),
      accessTotal: numberOrZero(row.access_paid_total),
      storedCharge: numberOrZero(row.charge_amount),
      nextUnlock: row.unlock_price == null ? null : numberOrZero(row.unlock_price),
    },
    metadata: resourceType === "note"
      ? {
          style: row.style,
          totalTokens: row.total_tokens == null ? null : numberOrZero(row.total_tokens),
        }
      : {
          durationSeconds: row.duration == null ? null : numberOrZero(row.duration),
          model: row.model,
        },
    participants,
  };
}

export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const requestedType = searchParams.get("type") ?? "all";
  const requestedMode = searchParams.get("mode") ?? "all";
  const search = (searchParams.get("search") ?? "").trim().slice(0, 120);

  const type = VALID_TYPES.has(requestedType) ? requestedType : "all";
  const mode = VALID_MODES.has(requestedMode) ? requestedMode : "all";
  const searchPattern = `%${search}%`;

  const [noteRows, transcriptRows] = await Promise.all([
    type === "transcript"
      ? Promise.resolve([])
      : sql`
          SELECT
            n.id,
            n.public_id,
            n.name AS title,
            n.generation_type,
            n.status,
            n.created_at,
            n.user_id AS generator_user_id,
            generator.username AS generator_username,
            generator.email AS generator_email,
            n.group_id,
            sg.name AS group_name,
            n.charge_amount,
            n.unlock_price,
            n.style,
            n.total_tokens,
            access.unlock_count,
            access.original_count,
            access.later_count,
            access.per_person_min,
            access.per_person_max,
            access.access_paid_total,
            access.participants
          FROM note n
          LEFT JOIN "user" generator ON generator.id = n.user_id
          LEFT JOIN student_group sg ON sg.id = n.group_id
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS unlock_count,
              COUNT(*) FILTER (WHERE COALESCE(na.is_original, 0) = 1)::int AS original_count,
              COUNT(*) FILTER (WHERE COALESCE(na.is_original, 0) <> 1)::int AS later_count,
              MIN(na.paid_amount) AS per_person_min,
              MAX(na.paid_amount) AS per_person_max,
              COALESCE(SUM(na.paid_amount), 0) AS access_paid_total,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'userId', participant.id,
                    'username', participant.username,
                    'email', participant.email,
                    'paidAmount', na.paid_amount,
                    'isOriginal', COALESCE(na.is_original, 0) = 1,
                    'unlockedAt', na.unlocked_at
                  )
                  ORDER BY COALESCE(na.is_original, 0) DESC, na.unlocked_at ASC
                ),
                '[]'::jsonb
              ) AS participants
            FROM note_access na
            JOIN "user" participant ON participant.id = na.user_id
            WHERE na.note_id = n.id
          ) access ON TRUE
          WHERE (${mode} = 'all' OR n.generation_type = ${mode})
            AND (
              ${search} = ''
              OR n.name ILIKE ${searchPattern}
              OR COALESCE(generator.username, '') ILIKE ${searchPattern}
              OR COALESCE(generator.email, '') ILIKE ${searchPattern}
              OR COALESCE(sg.name, '') ILIKE ${searchPattern}
            )
          ORDER BY n.created_at DESC
          LIMIT ${MAX_ROWS + 1}
        `,
    type === "note"
      ? Promise.resolve([])
      : sql`
          SELECT
            t.id,
            t.public_id,
            t.label AS title,
            t.generation_type,
            t.status,
            t.created_at,
            t.user_id AS generator_user_id,
            generator.username AS generator_username,
            generator.email AS generator_email,
            t.group_id,
            sg.name AS group_name,
            t.charge_amount,
            t.unlock_price,
            t.duration,
            t.model,
            access.unlock_count,
            access.original_count,
            access.later_count,
            access.per_person_min,
            access.per_person_max,
            access.access_paid_total,
            access.participants
          FROM transcript t
          LEFT JOIN "user" generator ON generator.id = t.user_id
          LEFT JOIN student_group sg ON sg.id = t.group_id
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS unlock_count,
              COUNT(*) FILTER (WHERE COALESCE(ta.is_original, 0) = 1)::int AS original_count,
              COUNT(*) FILTER (WHERE COALESCE(ta.is_original, 0) <> 1)::int AS later_count,
              MIN(ta.paid_amount) AS per_person_min,
              MAX(ta.paid_amount) AS per_person_max,
              COALESCE(SUM(ta.paid_amount), 0) AS access_paid_total,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'userId', participant.id,
                    'username', participant.username,
                    'email', participant.email,
                    'paidAmount', ta.paid_amount,
                    'isOriginal', COALESCE(ta.is_original, 0) = 1,
                    'unlockedAt', ta.unlocked_at
                  )
                  ORDER BY COALESCE(ta.is_original, 0) DESC, ta.unlocked_at ASC
                ),
                '[]'::jsonb
              ) AS participants
            FROM transcript_access ta
            JOIN "user" participant ON participant.id = ta.user_id
            WHERE ta.transcript_id = t.id
          ) access ON TRUE
          WHERE (${mode} = 'all' OR t.generation_type = ${mode})
            AND (
              ${search} = ''
              OR t.label ILIKE ${searchPattern}
              OR COALESCE(generator.username, '') ILIKE ${searchPattern}
              OR COALESCE(generator.email, '') ILIKE ${searchPattern}
              OR COALESCE(sg.name, '') ILIKE ${searchPattern}
            )
          ORDER BY t.created_at DESC
          LIMIT ${MAX_ROWS + 1}
        `,
  ]);

  const generations = [
    ...noteRows.map(row => formatGeneration(row, "note")),
    ...transcriptRows.map(row => formatGeneration(row, "transcript")),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const truncated = generations.length > MAX_ROWS;
  const visibleGenerations = generations.slice(0, MAX_ROWS);

  return NextResponse.json({
    generations: visibleGenerations,
    truncated,
    summary: {
      shown: visibleGenerations.length,
      notes: visibleGenerations.filter(item => item.resourceType === "note").length,
      transcripts: visibleGenerations.filter(item => item.resourceType === "transcript").length,
      group: visibleGenerations.filter(item => item.generationType === "group").length,
      individual: visibleGenerations.filter(item => item.generationType !== "group").length,
      unlocks: visibleGenerations.reduce((sum, item) => sum + item.unlocks.total, 0),
      collected: visibleGenerations.reduce(
        (sum, item) => sum + (item.generationType === "group" ? item.paid.accessTotal : item.paid.storedCharge),
        0
      ),
    },
  });
}
