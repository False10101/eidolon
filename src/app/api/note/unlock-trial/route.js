import { NextResponse } from 'next/server';
import { sql } from '@/lib/storage/db';
import { verifyUserData } from '@/lib/auth/verify';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req) {
    try {
        const userId = await verifyUserData(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const limited = await rateLimit(`rl:unlock-trial:${userId}`, 15, 60);
        if (limited) return limited;

        const body = await req.json();
        const { noteId } = body;

        if (!noteId) return NextResponse.json({ error: 'Missing note ID.' }, { status: 400 });

        // 1. Fetch the note and verify ownership & trial state
        const noteRows = await sql`
            SELECT id, user_id, is_trial, charge_amount, name 
            FROM "note" 
            WHERE public_id = ${noteId}
        `;
        const note = noteRows[0];

        if (!note) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
        if (note.user_id != userId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
        if (!note.is_trial) return NextResponse.json({ error: 'Note is already unlocked.' }, { status: 400 });

        const chargeAmount = parseFloat(note.charge_amount);
        if (!(chargeAmount > 0)) return NextResponse.json({ error: 'Generation has not completed yet or failed.' }, { status: 400 });

        // 2. Fetch user balance and deduct
        let finalBalance = 0;
        await sql.begin(async (tx) => {
            const [updated] = await tx`
                UPDATE "user" SET balance = balance - ${chargeAmount}
                WHERE id = ${userId} AND balance >= ${chargeAmount}
                RETURNING balance
            `;

            if (!updated) {
                // Manually throw to trigger rollback
                throw new Error('Insufficient balance.');
            }

            finalBalance = updated.balance;

            // 3. Unlock the note
            await tx`UPDATE "note" SET is_trial = false WHERE id = ${note.id}`;

            // 4. Log the activity now that it's formally purchased
            await tx`
                INSERT INTO "activity" (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after)
                VALUES ('note', ${note.name}, 'completed', ${userId}, ${note.id}, NOW(), ${chargeAmount}, ${finalBalance})
            `;
        });

        return NextResponse.json({ success: true, balance: finalBalance });
    } catch (error) {
        if (error.message === 'Insufficient balance.') {
            return NextResponse.json({ error: 'Insufficient balance.' }, { status: 400 });
        }
        console.error('Unlock trial error:', error);
        return NextResponse.json({ error: 'Failed to unlock note.' }, { status: 500 });
    }
}
