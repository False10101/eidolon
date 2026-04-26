import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/storage/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    const credits = parseInt(session.metadata?.credits);

    // Only process paid sessions
    if (session.payment_status !== 'paid') {
        return NextResponse.json({ received: true });
    }

    const userId    = parseInt(session.metadata?.user_id);
    const amountUsd = parseFloat(session.metadata?.amount_usd);

    if (!userId || isNaN(credits)) {
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