import { requireAdmin } from "../_lib/requireAdmin";
import { sql } from "@/lib/storage/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
 
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'all';
 
  const rows = status === 'all'
    ? await sql`
        SELECT
          pt.id, pt.amount, pt.reference_id, pt.slip_image_path,
          pt.status, pt.verified_by, pt.created_at, pt.reviewed_at,
          u.id AS user_id, u.username, u.email
        FROM pending_topups pt
        JOIN "user" u ON u.id = pt.user_id
        ORDER BY
          CASE WHEN pt.status IN ('pending', 'processing') THEN 0 ELSE 1 END,
          pt.created_at DESC
        LIMIT 100
      `
    : await sql`
        SELECT
          pt.id, pt.amount, pt.reference_id, pt.slip_image_path,
          pt.status, pt.verified_by, pt.created_at, pt.reviewed_at,
          u.id AS user_id, u.username, u.email
        FROM pending_topups pt
        JOIN "user" u ON u.id = pt.user_id
        WHERE pt.status = ${status}
        ORDER BY pt.created_at DESC
        LIMIT 100
      `;
 
  return NextResponse.json({
    topups: rows.map(t => ({
      id:            t.id,
      userId:        t.user_id,
      username:      t.username,
      email:         t.email,
      amount:        parseFloat(t.amount),
      ref:           t.reference_id,
      slipImagePath: t.slip_image_path,
      verifiedBy:    t.verified_by,
      status:        t.status,
      createdAt:     t.created_at,
      reviewedAt:    t.reviewed_at,
    })),
  });
}
 