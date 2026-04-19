import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
 
export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 
        const { publicId } = await req.json();
        if (!publicId) return NextResponse.json({ error: 'Missing publicId.' }, { status: 400 });
 
        const [examPrep] = await sql`
            SELECT id, user_id, status
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
            LIMIT 1
        `;
        if (!accessRow) return NextResponse.json({ error: 'This exam prep is not a group exam prep.' }, { status: 400 });
 
        const unlockPrice = accessRow.unlock_price;
 
        const [membership] = await sql`
            SELECT gm1.group_id FROM "group_member" gm1
            JOIN "group_member" gm2 ON gm2.group_id = gm1.group_id
            WHERE gm1.user_id = ${userId} AND gm2.user_id = ${examPrep.user_id}
            LIMIT 1
        `;
        if (!membership) return NextResponse.json({ error: 'You are not in the same group.' }, { status: 403 });
 
        const totalRebatePool = unlockPrice * 0.70;

        await sql.begin(async (tx) => {
            const [updated] = await tx`
                UPDATE "user" SET balance = balance - ${unlockPrice}
                WHERE id = ${userId} AND balance >= ${unlockPrice}
                RETURNING balance
            `;
            if (!updated) throw new Error('Insufficient balance.');
 
            await tx`
                INSERT INTO exam_prep_access (exam_prep_id, user_id, paid_amount, is_original, unlock_price)
                VALUES (${examPrep.id}, ${userId}, ${unlockPrice}, 0, ${unlockPrice})
            `;
 
            await tx`
                INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                VALUES ('exam_prep', 'Unlocked group exam prep', 'completed', ${userId}, ${examPrep.id}, NOW(), ${unlockPrice}, ${updated.balance})
            `;

            const allOriginalGenners = await tx`
                SELECT user_id FROM exam_prep_access WHERE exam_prep_id = ${examPrep.id} AND is_original = 1
            `;

            if (allOriginalGenners.length > 0) {
                const userCut = parseFloat((totalRebatePool / allOriginalGenners.length).toFixed(2));

                const activeOriginalGenners = await tx`
                    SELECT epa.user_id 
                    FROM exam_prep_access epa
                    JOIN "group_member" gm ON gm.user_id = epa.user_id AND gm.group_id = ${membership.group_id}
                    WHERE epa.exam_prep_id = ${examPrep.id} AND epa.is_original = 1
                `;

                for (const genner of activeOriginalGenners) {
                    const [ownerUpdated] = await tx`
                        UPDATE "user" SET balance = balance + ${userCut}
                        WHERE id = ${genner.user_id}
                        RETURNING balance
                    `;

                    await tx`
                        INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                        VALUES ('rebate', 'Group exam prep unlocked by new member', 'completed', ${genner.user_id}, ${examPrep.id}, NOW(), ${-userCut}, ${ownerUpdated.balance})
                    `;
                }
            }
        });
 
        return NextResponse.json({ success: true });
    } catch (error) {
        const msg = error.message ?? 'Internal server error';
        const status = msg === 'Insufficient balance.' ? 400 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}