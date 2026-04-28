import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { requireAdmin } from "../../_lib/requireAdmin";

export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { referrerId } = await req.json();
  if (!referrerId) return NextResponse.json({ error: "Missing referrerId" }, { status: 400 });

  const [updated] = await sql`
    UPDATE "user"
    SET referral_last_paid_at = NOW()
    WHERE id = ${referrerId}
    RETURNING referral_last_paid_at
  `;

  if (!updated) return NextResponse.json({ error: "Referrer not found" }, { status: 404 });

  return NextResponse.json({ paidAt: updated.referral_last_paid_at });
}
