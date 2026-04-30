import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/storage/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const THB_RATE = Number(process.env.TOPUP_THB_RATE || 35);

export async function POST(req) {
    const rawBody  = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature.' }, { status: 401 });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }

    if (event.type !== 'checkout.session.completed') {
        return NextResponse.json({ received: true });
    }

    const session = event.data.object;

    // Only process paid sessions
    if (session.payment_status !== 'paid') {
        return NextResponse.json({ received: true });
    }

    const userId = parseInt(session.metadata?.user_id);
    const amountTotal = Number(session.amount_total);
    const currency = String(session.currency || '').toLowerCase();
    const trustedThbRate = Number.isFinite(THB_RATE) && THB_RATE > 0 ? THB_RATE : 35;

    let amountUsd;
    if (currency === 'usd') {
        amountUsd = amountTotal / 100;
    } else if (currency === 'thb') {
        amountUsd = (amountTotal / 100) / trustedThbRate;
    } else {
        amountUsd = NaN;
    }

    const credits = Math.round(amountUsd * 100);

    if (!userId || !Number.isFinite(amountTotal) || !Number.isFinite(amountUsd) || isNaN(credits)) {
        console.error('Stripe webhook: missing metadata', session.metadata);
        return NextResponse.json({ error: 'Invalid metadata.' }, { status: 400 });
    }

    // Idempotency check — don't credit the same session twice (keyed on ref alone)
    const [existing] = await sql`
        SELECT id FROM activity
        WHERE type = 'topup'
        AND ref = ${session.id}
        LIMIT 1
    `;
    if (existing) {
        return NextResponse.json({ received: true });
    }

    await sql.begin(async (tx) => {
        const [updated] = await tx`
            UPDATE "user"
            SET balance = balance + ${credits}
            WHERE id = ${userId}
            RETURNING balance
        `;

        await tx`
            INSERT INTO activity (type, title, status, user_id, respective_table_id, date, charge_amount, balance_after, ref)
            VALUES ('topup', ${`Topped up $${amountUsd.toFixed(2)}`}, 'completed', ${userId}, 0, NOW(), ${credits}, ${updated.balance}, ${session.id})
        `;
    });

    return NextResponse.json({ received: true });
}
