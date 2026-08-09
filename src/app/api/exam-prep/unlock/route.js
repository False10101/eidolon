import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { rateLimit } from "@/lib/rateLimit";
import { getGroupTierPrice } from "@/app/api/note/generate/group/route";

const EXAM_PREP_AVAILABLE = false;

export async function POST(req) {
    if (!EXAM_PREP_AVAILABLE) {
        return NextResponse.json({ error: 'Exam Prep is coming soon.' }, { status: 503 });
    }

    try {
        const userId = await verifyUserData(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const limited = await rateLimit(`rl:unlock:${userId}`, 15, 60);
        if (limited) return limited;

        const { publicId } = await req.json();
        if (!publicId) return NextResponse.json({ error: 'Missing publicId.' }, { status: 400 });
 
        const [examPrep] = await sql`
            SELECT id, label, user_id, status, total_tokens
            FROM exam_prep WHERE public_id = ${publicId}
        `;
 
        if (!examPrep) return NextResponse.json({ error: 'Exam prep not found.' }, { status: 404 });
        if (examPrep.status !== 'Completed') return NextResponse.json({ error: 'Exam prep is not ready yet.' }, { status: 400 });
        if (examPrep.user_id === userId) return NextResponse.json({ error: 'You already own this exam prep.' }, { status: 400 });
 
        const [existing] = await sql`
            SELECT exam_prep_id FROM exam_prep_access
            WHERE exam_prep_id = ${examPrep.id} AND user_id = ${userId}
        `;
        if (existing) return NextResponse.json({ error: 'Already unlocked.' }, { status: 400 });
 
        const [accessRow] = await sql`
            SELECT unlock_price FROM exam_prep_access
            WHERE exam_prep_id = ${examPrep.id}
            ORDER BY id ASC
            LIMIT 1
        `;
        if (!accessRow) return NextResponse.json({ error: 'This exam prep is not a group exam prep.' }, { status: 400 });

        const unlockPrice = parseFloat(accessRow.unlock_price);
        if (!(unlockPrice > 0)) return NextResponse.json({ error: 'Invalid unlock price.' }, { status: 400 });
 
        const [membership] = await sql`
            SELECT gm1.group_id FROM "group_member" gm1
            JOIN "group_member" gm2 ON gm2.group_id = gm1.group_id
            WHERE gm1.user_id = ${userId} AND gm2.user_id = ${examPrep.user_id}
            LIMIT 1
        `;
        if (!membership) return NextResponse.json({ error: 'You are not in the same group.' }, { status: 403 });
 
        await sql.begin(async (tx) => {
            const existingAccess = await tx`
                SELECT id, user_id, paid_amount FROM exam_prep_access WHERE exam_prep_id = ${examPrep.id}
            `;
            const currentCount = existingAccess.length;
            const newCount = currentCount + 1;
            const newPerPerson = getGroupTierPrice(examPrep.total_tokens, newCount);

            const [updated] = await tx`
                UPDATE "user" SET balance = balance - ${newPerPerson}
                WHERE id = ${userId} AND balance >= ${newPerPerson}
                RETURNING balance
            `;
            if (!updated) throw new Error('Insufficient balance.');
 
            await tx`
                INSERT INTO exam_prep_access (exam_prep_id, user_id, paid_amount, is_original, unlock_price)
                VALUES (${examPrep.id}, ${userId}, ${newPerPerson}, 0, ${newPerPerson})
            `;
 
            await tx`
                INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                VALUES ('exam_prep', ${`Unlocked exam prep: ${examPrep.label}`}, 'completed', ${userId}, ${examPrep.id}, NOW(), ${newPerPerson}, ${updated.balance})
            `;

            // Refund existing members if the price dropped or 1st generator gets 2nd member
            for (const member of existingAccess) {
                const paid = parseFloat(member.paid_amount);
                const isGenerator = examPrep.user_id === member.user_id;
                const expectedCost = isGenerator ? parseFloat((newPerPerson * 0.5).toFixed(2)) : newPerPerson;

                if (paid > expectedCost) {
                    const refund = parseFloat((paid - expectedCost).toFixed(2));

                    const [ownerUpdated] = await tx`
                        UPDATE "user" SET balance = balance + ${refund}
                        WHERE id = ${member.user_id}
                        RETURNING balance
                    `;

                    await tx`
                        UPDATE exam_prep_access SET paid_amount = ${expectedCost}
                        WHERE id = ${member.id}
                    `;

                    await tx`
                        INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                        VALUES ('rebate', ${`Tier discount refund: ${examPrep.label}`}, 'completed', ${member.user_id}, ${examPrep.id}, NOW(), ${-refund}, ${ownerUpdated.balance})
                    `;
                }
            }

            // Update the global unlock price for the next person
            await tx`UPDATE exam_prep SET unlock_price = ${newPerPerson} WHERE id = ${examPrep.id}`;
        });
 
        return NextResponse.json({ success: true });
    } catch (error) {
        const msg = error.message ?? 'Internal server error';
        const status = msg === 'Insufficient balance.' ? 400 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}
