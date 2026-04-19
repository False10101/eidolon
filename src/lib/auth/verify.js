import { sql } from "../storage/db";
import { jwtVerify, createRemoteJWKSet } from "jose";

const domain = process.env.AUTH0_DOMAIN.startsWith('http') ? process.env.AUTH0_DOMAIN : `https://${process.env.AUTH0_DOMAIN}`;
const JWKS = createRemoteJWKSet(new URL(`${domain}/.well-known/jwks.json`));

export async function verifyUserData(req) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `${domain}/`,
            audience: process.env.AUTH0_AUDIENCE,
        });

        const googleId = payload.sub;

        const rows = await sql`SELECT id FROM "user" WHERE google_id = ${googleId}`;

        if (rows.length === 0) return null;
        return rows[0].id;
    } catch (error) {
        console.error("Auth Error:", error);
        return null;
    }
}