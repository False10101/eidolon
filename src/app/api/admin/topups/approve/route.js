import { requireAdmin } from "../../_lib/requireAdmin";
import { sql } from "@/lib/storage/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
 
  const { topupId, manualAmount } = await req.json();
  if (!topupId) return NextResponse.json({ error: "topupId required" }, { status: 400 });
 
  const [topup] = await sql`
    SELECT * FROM pending_topups
    WHERE id = ${topupId} AND status = 'pending'
    LIMIT 1
  `;
  if (!topup) return NextResponse.json({ error: "Not found or already processed" }, { status: 404 });
 
  const finalAmount = topup.verified_by === 'manual' 
        ? parseFloat(manualAmount) 
        : parseFloat(topup.amount);

  if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount provided" }, { status: 400 });
  }

  await sql.begin(async (tx) => {
    const [updated] = await tx`
      UPDATE "user"
      SET balance = balance + ${finalAmount}
      WHERE id = ${topup.user_id}
      RETURNING balance
    `;
   
    await tx`
      UPDATE pending_topups
      SET status = 'approved', amount = ${finalAmount}, reviewed_at = NOW(), reviewed_by = ${admin.id}
      WHERE id = ${topupId}
    `;
   
    await tx`
      INSERT INTO activity (user_id, type, title, status, charge_amount, balance_after, ref, date)
      VALUES (
        ${topup.user_id},
        'topup',
        ${'Manual approval — ref #' + (topup.reference_id ?? 'N/A')},
        'completed',
        ${finalAmount},
        ${updated.balance},
        ${topup.reference_id},
        NOW()
      )
    `;
  });
 
  return NextResponse.json({ ok: true });
}