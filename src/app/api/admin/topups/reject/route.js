import { requireAdmin } from "../../_lib/requireAdmin";
import { sql } from "@/lib/storage/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
 
  const { topupId } = await req.json();
  if (!topupId) return NextResponse.json({ error: "topupId required" }, { status: 400 });
 
  const [topup] = await sql`
    SELECT id FROM pending_topups
    WHERE id = ${topupId} AND status = 'pending'
    LIMIT 1
  `;
  if (!topup) return NextResponse.json({ error: "Not found or already processed" }, { status: 404 });
 
  await sql`
    UPDATE pending_topups
    SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ${admin.id}
    WHERE id = ${topupId}
  `;
 
  return NextResponse.json({ ok: true });
}
 