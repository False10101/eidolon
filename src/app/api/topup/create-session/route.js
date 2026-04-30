import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyUserData } from '@/lib/auth/verify';
import { sql } from '@/lib/storage/db';
import { rateLimit } from '@/lib/rateLimit';
import { getFxRate } from '@/lib/topup/fx';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const MIN_AMOUNT = 1.50;
const MAX_AMOUNT = 1000;

export async function POST(req) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limited = await rateLimit(`rl:topup:${userId}`, 15, 60);
    if (limited) return limited;

    const { amount, currency } = await req.json();

    if (!amount || typeof amount !== 'number') {
        return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
    }

    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
        return NextResponse.json({ error: `Amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}.` }, { status: 400 });
    }

    const amountUsd    = parseFloat(amount.toFixed(2));
    const credits      = Math.round(amountUsd * 100);

    // The client may suggest a display currency, but the server alone decides the rate.
    const trustedThbRate = currency === 'THB' ? await getFxRate('THB') : null;
    const isThb = currency === 'THB' && trustedThbRate && trustedThbRate > 0;
    const sessionCurrency = isThb ? 'thb' : 'usd';
    const unitAmount = isThb
        ? Math.round(amountUsd * trustedThbRate * 100)
        : Math.round(amountUsd * 100);

    const [user] = await sql`SELECT email FROM "user" WHERE id = ${userId}`;
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const configuredOrigin = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!configuredOrigin) {
        console.error('Missing APP_URL or NEXT_PUBLIC_APP_URL for Stripe return URLs.');
        return NextResponse.json({ error: 'Top-up is temporarily unavailable.' }, { status: 500 });
    }

    const origin = configuredOrigin.replace(/\/+$/, '');

    const productName = isThb
        ? `Eidolon Credits — ฿${Math.round(amountUsd * trustedThbRate)}`
        : `Eidolon Credits — $${amountUsd}`;

    const session = await stripe.checkout.sessions.create({
        mode:           'payment',
        currency:       sessionCurrency,
        customer_email: user.email,
        // No payment_method_types — Stripe shows all enabled methods for the currency automatically
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency:     sessionCurrency,
                    unit_amount:  unitAmount,
                    product_data: {
                        name:        productName,
                        description: 'Credits are added instantly to your account after payment.',
                    },
                },
            },
        ],
        metadata: {
            user_id:    userId.toString(),
            amount_usd: amountUsd.toString(),  // always USD — used by webhook to calc credits
            credits:    credits.toString(),
        },
        success_url: `${origin}/topup?topup=success`,
        cancel_url: `${origin}/topup?topup=cancel`,
    });

    return NextResponse.json({ url: session.url });
}
