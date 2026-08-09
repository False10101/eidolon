import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db"; 
import { requireAdmin } from "../../_lib/requireAdmin";

export async function POST(req) {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id, delta, reason } = await req.json();
    const user_id = parseInt(id);
    const verified_delta = parseFloat(delta);

    if (!user_id || !Number.isFinite(verified_delta) || verified_delta === 0 || Math.abs(verified_delta) > 10000) {
        return NextResponse.json({ error: "Invalid user ID or delta (maximum absolute adjustment is 10,000)" }, { status: 400 });
    }
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) {
        return NextResponse.json({ error: 'A reason between 3 and 500 characters is required.' }, { status: 400 });
    }

    const activityType = verified_delta > 0 ? 'topup' : 'admin_deduction';
    const activityTitle = `Admin ${verified_delta > 0 ? 'credit' : 'deduction'}: ${reason.trim()}`.slice(0, 100);

    try {
        const result = await sql.begin(async (tx) => {
          const updatedUser = await tx`
            UPDATE "user" SET balance = balance + ${verified_delta}
            WHERE id = ${user_id} AND balance + ${verified_delta} >= 0
            RETURNING id, balance
          `;
          if (updatedUser.length === 0) throw new Error('USER_NOT_FOUND_OR_NEGATIVE');
          await tx`
            INSERT INTO activity (
                user_id, 
                type, 
                title, 
                charge_amount, 
                balance_after, 
                status, 
                date,
                respective_table_id
            ) VALUES (
                ${user_id}, 
                ${activityType},
                ${activityTitle},
                ${Math.abs(verified_delta)},
                ${updatedUser[0].balance}, 
                'completed', 
                NOW(),
                ${admin.id}
            )
          `;
          return updatedUser[0];
        });

        return NextResponse.json({ 
            success: true, 
            balance: result.balance 
        });

    } catch (error) {
        if (error.message === 'USER_NOT_FOUND_OR_NEGATIVE') return NextResponse.json({ error: 'User not found or adjustment would create a negative balance.' }, { status: 400 });
        console.error("POST /admin/users/balance error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
