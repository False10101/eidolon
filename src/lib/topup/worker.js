import { Worker } from "bullmq";
import { promises as fs } from 'fs';
import { r2, PutObjectCommand } from "../r2.js";
import connection from "../redis.js";
import { sql } from "../storage/db.js";

const pushToLine = async (userId, text) => {
    await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
    });
}

const worker = new Worker(('slip-verification'), async (job) => {
    const { pendingTopupId, userId, lineUserId, localFilePath, fileName } = job.data;

    try {
        let fileBuffer;
        try {
            fileBuffer = await fs.readFile(localFilePath);
        } catch (err) {
            console.error(`File missing for job ${job.id}:`, localFilePath);
            await sql`UPDATE pending_topups SET status = 'failed', verified_by = 'system' WHERE id = ${pendingTopupId}`;
            await pushToLine(lineUserId, 'Hey, really sorry but we had a quick server hiccup and I lost your slip image! Could you resend it for me?');
            return;
        }

        // ── Upload to R2 first, before any verification logic ──
        const r2Key = `slips/${fileName}`;
        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_SLIP_BUCKET_NAME,
            Key: r2Key,
            Body: fileBuffer,
            ContentType: 'image/jpeg'
        }));

        const imageBlob = new Blob([fileBuffer], { type: 'image/jpeg' });
        const form = new FormData();
        form.append('file', imageBlob, 'slip.jpg');

        const verifyRes = await fetch('https://connect.slip2go.com/api/verify-slip/qr-image/info', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.SLIP2GO_API_KEY}` },
            body: form,
        });

        const verifyData = await verifyRes.json();

        if (verifyData.data && verifyData.data.amount) {
            const receiverName = verifyData.data.receiver?.account?.name;
            const receiverAccount = verifyData.data.receiver?.account?.proxy?.account || "";
            const safeName = (receiverName || "").toUpperCase();
            const isMyAccount = /\bMIN\b/.test(safeName) && receiverAccount.endsWith("8446");

            if (!isMyAccount) {
                console.error(`Slip valid, but wrong receiver: ${receiverName} / ${receiverAccount}`);
                await sql`UPDATE pending_topups SET status = 'rejected', verified_by = 'system', slip_image_path = ${r2Key} WHERE id = ${pendingTopupId}`;
                await pushToLine(lineUserId, 'Hmm, this is a real bank slip, but it looks like the money didn\'t go to the official Eidolon account! Could you double-check who you sent it to?');
                await fs.unlink(localFilePath).catch(() => { });
                return;
            }

            const amount = verifyData.data.amount;
            const transactionRef = verifyData.data.transRef ?? null;

            if (!transactionRef) {
                console.warn(`Job ${job.id}: no transRef in API response, routing to manual`);
                await sql`UPDATE pending_topups SET status = 'pending', verified_by = 'manual', slip_image_path = ${r2Key} WHERE id = ${pendingTopupId}`;
                await pushToLine(lineUserId, 'The slip verified but I couldn\'t grab the transaction reference from the bank. Flagging for manual review just to be safe!');
                await fs.unlink(localFilePath).catch(() => { });
                return;
            }


            const existing = await sql`SELECT id FROM "activity" WHERE ref = ${transactionRef} AND type = 'topup'`;
            if (existing.length > 0) {
                await sql`UPDATE pending_topups SET status = 'rejected', verified_by = 'easyslip', slip_image_path = ${r2Key} WHERE id = ${pendingTopupId}`;
                await pushToLine(lineUserId, 'Wait a sec, this slip looks like it\'s already been used! If you think this is a mistake, just let support know.');
                await fs.unlink(localFilePath).catch(() => { });
                return;
            }

            await sql.begin(async (tx) => {
                const [userUpdated] = await tx`
                    UPDATE "user" SET balance = balance + ${amount} 
                    WHERE id = ${userId} RETURNING balance
                `;
                await tx`
                    INSERT INTO "activity" (user_id, type, title, status, date, charge_amount, balance_after, ref)
                    VALUES (${userId}, 'topup', ${'Topped up ฿' + amount}, 'completed', NOW(), ${amount}, ${userUpdated.balance}, ${transactionRef})
                `;
                await tx`
                    UPDATE pending_topups 
                    SET status = 'approved', amount = ${amount}, verified_by = 'easyslip', slip_image_path = ${r2Key}
                    WHERE id = ${pendingTopupId}
                `;
            });

            await pushToLine(lineUserId, `All set! \nJust added ฿${amount} to your account. Your new balance is ready to go. Thanks for using Eidolon! ✨`);
            await fs.unlink(localFilePath).catch(() => { });
            return;
        }

        // EasySlip couldn't parse it → manual review
        await sql`
            UPDATE pending_topups 
            SET status = 'pending', verified_by = 'manual', slip_image_path = ${r2Key} 
            WHERE id = ${pendingTopupId}
        `;
        await pushToLine(lineUserId, 'Looks like the bank is taking longer than usual to respond (or the QR was a bit hard to read). No worries! I\'ve dropped it on the admin desk to review manually. Your balance will update shortly!');
        await fs.unlink(localFilePath).catch(() => { });

    } catch (error) {
        console.error(`Worker failed on job ${job.id}:`, error);
        await sql`UPDATE pending_topups SET status = 'pending', verified_by = 'manual' WHERE id = ${pendingTopupId}`;
        await pushToLine(lineUserId, 'Oops, something went wrong on my end while verifying that. I\'ve flagged it for the admins to fix manually! 🛠️');
    }
}, { connection, concurrency: 2 });

worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));
worker.on('completed', (job) => console.log(`Job ${job.id} completed.`));