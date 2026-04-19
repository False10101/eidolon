import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { publicId } = await req.json();
        if (!publicId) return NextResponse.json({ error: "Missing publicId." }, { status: 400 });

        const [note] = await sql`
            SELECT id, unlock_price, generation_type, status, user_id
            FROM "note" WHERE public_id = ${publicId}
        `;

        if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
        if (note.generation_type !== 'group') return NextResponse.json({ error: "Only group notes can be unlocked." }, { status: 400 });
        if (note.status !== 'completed') return NextResponse.json({ error: "Note is not ready yet." }, { status: 400 });
        if (note.user_id === userId) return NextResponse.json({ error: "You already own this note." }, { status: 400 });

        const [existing] = await sql`
            SELECT note_id FROM "note_access" WHERE note_id = ${note.id} AND user_id = ${userId}
        `;
        if (existing) return NextResponse.json({ error: "Already unlocked." }, { status: 400 });

        const [membership] = await sql`
            SELECT gm1.group_id FROM "group_member" gm1
            JOIN "group_member" gm2 ON gm2.group_id = gm1.group_id
            WHERE gm1.user_id = ${userId} AND gm2.user_id = ${note.user_id}
            LIMIT 1
        `;
        if (!membership) return NextResponse.json({ error: "You are not in the same group." }, { status: 403 });

        const totalRebatePool = note.unlock_price * 0.70;

        await sql.begin(async (tx) => {
            const [updated] = await tx`
                UPDATE "user" SET balance = balance - ${note.unlock_price}
                WHERE id = ${userId} AND balance >= ${note.unlock_price}
                RETURNING balance
            `;
            if (!updated) throw new Error('Insufficient balance.');

            await tx`
                INSERT INTO "note_access" (note_id, user_id, paid_amount, is_original)
                VALUES (${note.id}, ${userId}, ${note.unlock_price}, 0)
            `;

            await tx`
                INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                VALUES ('note', 'Unlocked group note', 'completed', ${userId}, ${note.id}, NOW(), ${note.unlock_price}, ${updated.balance})
            `;

            const allOriginalGenners = await tx`
                SELECT user_id FROM "note_access" WHERE note_id = ${note.id} AND is_original = 1
            `;

            if (allOriginalGenners.length > 0) {
                const userCut = parseFloat((totalRebatePool / allOriginalGenners.length).toFixed(2));

                const activeOriginalGenners = await tx`
                    SELECT na.user_id 
                    FROM "note_access" na
                    JOIN "group_member" gm ON gm.user_id = na.user_id AND gm.group_id = ${membership.group_id}
                    WHERE na.note_id = ${note.id} AND na.is_original = 1
                `;

                for (const genner of activeOriginalGenners) {
                    const [ownerUpdated] = await tx`
                        UPDATE "user" SET balance = balance + ${userCut}
                        WHERE id = ${genner.user_id}
                        RETURNING balance
                    `;

                    await tx`
                        INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                        VALUES ('rebate', 'Group note unlocked by new member', 'completed', ${genner.user_id}, ${note.id}, NOW(), ${-userCut}, ${ownerUpdated.balance})
                    `;
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        const msg = error.message ?? 'Internal server error';
        const status = msg === 'Insufficient balance.' ? 400 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}