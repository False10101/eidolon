import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { slipQueue } from "@/lib/queue";

const replyToLine = async (replyToken, text) => {
    await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
            replyToken,
            messages: [{ type: 'text', text }],
        }),
    });
};

async function processSlip(body) {

    const event = body.events?.[0];

    if (!event) return;

    if (event.type === 'message' && event.message?.type !== 'image') {
        await replyToLine(event.replyToken, 'Hey! Could you send that PromptPay slip as an image? Makes it easier for me to check!');
        return;
    }

    if (!event || event.type !== 'message' || event.message?.type !== 'image') return;

    const lineUserId = event.source?.userId;
    const messageId = event.message?.id;
    const replyToken = event.replyToken;

    try {
        const users = await sql`SELECT id FROM "user" WHERE line_user_id = ${lineUserId}`;

        if (!users[0]) {
            await replyToLine(replyToken, 'Looks like your LINE isn\'t linked to an Eidolon account yet! You can quickly connect it at eidolon.minpainghein.com/topup first.');
            return;
        }
        const user = users[0];

        const imageRes = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
            headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
        });

        if (!imageRes.ok) {
            await replyToLine(replyToken, 'Hmm, I\'m having a little trouble downloading that image. Could you try sending it one more time?');
            return;
        }

        const imageBuffer = await imageRes.arrayBuffer();
        const bufferDir = path.join(process.cwd(), 'tmp-slips');
        await fs.mkdir(bufferDir, { recursive: true });

        const fileName = `${user.id}-${Date.now()}.jpg`;
        const localFilePath = path.join(bufferDir, fileName);
        await fs.writeFile(localFilePath, Buffer.from(imageBuffer));

        const [pendingTopup] = await sql`
            INSERT INTO pending_topups (user_id, status, created_at)
            VALUES (${user.id}, 'processing', NOW())
            RETURNING id
        `;

        await slipQueue.add('slip-verification', {
            pendingTopupId: pendingTopup.id,
            userId: user.id,
            lineUserId: lineUserId,
            localFilePath: localFilePath,
            fileName: fileName
        }, {
            delay: 1 * 60 * 1000,
            removeOnComplete: true,
            removeOnFail: false
        });

        // 6. Instant Reply
        await replyToLine(replyToken, 'Got it, thanks! The bank system can be a bit slow to sync, so give me about 5 minutes to verify this. I\'ll ping you the second your balance is updated—you can close this chat for now!');

    } catch (err) {
        console.error('Webhook processing error:', err);
        try { await replyToLine(replyToken, 'Oops, something went wrong on my end while verifying that. Please try again or contact support.'); } catch (_) { }
    }
}

export async function POST(req) {
    const rawBody = await req.text();

    // Verify LINE signature
    const signature = req.headers.get('x-line-signature');
    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const hmac = crypto
        .createHmac('sha256', process.env.LINE_CHANNEL_SECRET)
        .update(rawBody)
        .digest('base64');

    if (hmac !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    processSlip(body).catch(err => console.error('Background processing error:', err));

    return NextResponse.json({ ok: true });
}