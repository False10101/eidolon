import { verifyUserData } from "@/lib/auth/verify";
import { sql } from "@/lib/storage/db";
import { NextResponse } from "next/server";

export async function POST(req) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();

    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/topup?line=true`,
            client_id: process.env.LINE_LOGIN_CHANNEL_ID,
            client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
        }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return NextResponse.json({ error: 'LINE auth failed' }, { status: 400 });

    const profileRes = await fetch('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    await sql`UPDATE "user" SET line_user_id = ${profile.userId}, line_display_name = ${profile.displayName} WHERE id = ${userId}`;

    return NextResponse.json({ display_name: profile.displayName });
}