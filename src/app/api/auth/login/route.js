import { sql } from '@/lib/storage/db';
import { jwtVerify, createRemoteJWKSet } from 'jose';

// Ensures https:// is present
const domain = process.env.AUTH0_DOMAIN.startsWith('http') ? process.env.AUTH0_DOMAIN : `https://${process.env.AUTH0_DOMAIN}`;
const JWKS = createRemoteJWKSet(new URL(`${domain}/.well-known/jwks.json`));

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 });

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${domain}/`,
      audience: process.env.AUTH0_AUDIENCE,
    });

    const googleId = payload.sub;

    // 🚨 THE FIX: Access tokens don't have emails. We MUST fetch it manually from Auth0! 🚨
    const userInfoRes = await fetch(`${domain}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const userInfo = await userInfoRes.json();
    
    const email = userInfo.email; 
    const username = userInfo.nickname || userInfo.name || 'User';
    const picture = userInfo.picture || '';

    // 1. Try finding by google_id
    // Postgres.js returns an array directly, so we don't need [rows] destructuring
    let rows = await sql`SELECT * FROM "user" WHERE google_id = ${googleId}`;
    let user = rows[0];

    // 2. AUTO-LINK FIX: Now that we ACTUALLY have the email, link it!
    if (!user && email) {
        const emailRows = await sql`SELECT * FROM "user" WHERE email = ${email}`;
        user = emailRows[0];

        if (user) {
            // Found your old account! Link the Google ID permanently
            await sql`UPDATE "user" SET google_id = ${googleId} WHERE id = ${user.id}`;
        }
    }

    // 3. If STILL not found, create brand new user
    if (!user) {
      // Postgres superpower: RETURNING * lets us skip the second SELECT query entirely!
      const newRows = await sql`
        INSERT INTO "user" (username, email, google_id, avatar_url, last_login, status, role, balance) 
        VALUES (${username}, ${email}, ${googleId}, ${picture}, NOW(), 'normal', 'user', 0.00)
        RETURNING *
      `;
      user = newRows[0];
    } else {
      // Update last login
      await sql`UPDATE "user" SET last_login = NOW(), avatar_url = ${picture} WHERE id = ${user.id}`;
    }

    return new Response(JSON.stringify({ 
      userId: user.id, // Your old ID is safe and returned!
      username: user.username,
      role: user.role 
    }), { status: 200 });

  } catch (error) {
    console.error("JWT Verification or sql failed:", error);
    return new Response(JSON.stringify({ error: 'Invalid Token or Server Error' }), { status: 401 });
  }
}