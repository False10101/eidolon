import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { requireAdmin } from "../_lib/requireAdmin";
 
export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
 
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const filter = searchParams.get('filter') ?? 'all';
 
  // Build query dynamically — can't use conditional sql fragments cleanly,
  // so run separate queries based on filter
  let rows;
 
  if (filter === 'active') {
    rows = search
      ? await sql`
          SELECT u.id, u.username, u.email, u.balance, u.created_at, u.last_login,
            COALESCE(s.total_spent, 0)::numeric AS total_spent,
            COALESCE(s.generations, 0)::int     AS generations
          FROM "user" u
          LEFT JOIN (
            SELECT user_id, SUM(charge_amount) AS total_spent, COUNT(*) AS generations
            FROM activity WHERE type != 'topup' GROUP BY user_id
          ) s ON s.user_id = u.id
          WHERE u.role != 'admin'
            AND u.last_login >= NOW() - INTERVAL '7 days'
            AND (u.username ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})
          ORDER BY u.last_login DESC NULLS LAST
        `
      : await sql`
          SELECT u.id, u.username, u.email, u.balance, u.created_at, u.last_login,
            COALESCE(s.total_spent, 0)::numeric AS total_spent,
            COALESCE(s.generations, 0)::int     AS generations
          FROM "user" u
          LEFT JOIN (
            SELECT user_id, SUM(charge_amount) AS total_spent, COUNT(*) AS generations
            FROM activity WHERE type != 'topup' GROUP BY user_id
          ) s ON s.user_id = u.id
          WHERE u.role != 'admin'
            AND u.last_login >= NOW() - INTERVAL '7 days'
          ORDER BY u.last_login DESC NULLS LAST
        `;
  } else if (filter === 'inactive') {
    rows = search
      ? await sql`
          SELECT u.id, u.username, u.email, u.balance, u.created_at, u.last_login,
            COALESCE(s.total_spent, 0)::numeric AS total_spent,
            COALESCE(s.generations, 0)::int     AS generations
          FROM "user" u
          LEFT JOIN (
            SELECT user_id, SUM(charge_amount) AS total_spent, COUNT(*) AS generations
            FROM activity WHERE type != 'topup' GROUP BY user_id
          ) s ON s.user_id = u.id
          WHERE u.role != 'admin'
            AND (u.last_login IS NULL OR u.last_login < NOW() - INTERVAL '7 days')
            AND (u.username ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})
          ORDER BY u.last_login DESC NULLS LAST
        `
      : await sql`
          SELECT u.id, u.username, u.email, u.balance, u.created_at, u.last_login,
            COALESCE(s.total_spent, 0)::numeric AS total_spent,
            COALESCE(s.generations, 0)::int     AS generations
          FROM "user" u
          LEFT JOIN (
            SELECT user_id, SUM(charge_amount) AS total_spent, COUNT(*) AS generations
            FROM activity WHERE type != 'topup' GROUP BY user_id
          ) s ON s.user_id = u.id
          WHERE u.role != 'admin'
            AND (u.last_login IS NULL OR u.last_login < NOW() - INTERVAL '7 days')
          ORDER BY u.last_login DESC NULLS LAST
        `;
  } else {
    // all
    rows = search
      ? await sql`
          SELECT u.id, u.username, u.email, u.balance, u.created_at, u.last_login,
            COALESCE(s.total_spent, 0)::numeric AS total_spent,
            COALESCE(s.generations, 0)::int     AS generations
          FROM "user" u
          LEFT JOIN (
            SELECT user_id, SUM(charge_amount) AS total_spent, COUNT(*) AS generations
            FROM activity WHERE type != 'topup' GROUP BY user_id
          ) s ON s.user_id = u.id
          WHERE u.role != 'admin'
            AND (u.username ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})
          ORDER BY u.last_login DESC NULLS LAST
        `
      : await sql`
          SELECT u.id, u.username, u.email, u.balance, u.created_at, u.last_login,
            COALESCE(s.total_spent, 0)::numeric AS total_spent,
            COALESCE(s.generations, 0)::int     AS generations
          FROM "user" u
          LEFT JOIN (
            SELECT user_id, SUM(charge_amount) AS total_spent, COUNT(*) AS generations
            FROM activity WHERE type != 'topup' GROUP BY user_id
          ) s ON s.user_id = u.id
          WHERE u.role != 'admin'
          ORDER BY u.last_login DESC NULLS LAST
        `;
  }
 
  const now = Date.now();
  return NextResponse.json({
    users: rows.map(u => ({
      id:          u.id,
      username:    u.username,
      email:       u.email,
      balance:     parseFloat(u.balance ?? 0),
      totalSpent:  parseFloat(u.total_spent ?? 0),
      generations: Number(u.generations ?? 0),
      lastLogin:   u.last_login,
      isActive:    u.last_login && (now - new Date(u.last_login).getTime()) < 7 * 24 * 60 * 60 * 1000,
      createdAt:   u.created_at,
    })),
  });
}
 
 