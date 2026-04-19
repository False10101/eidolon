// app/api/admin/_lib/requireAdmin.js
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function requireAdmin(req) {
  const userId = await verifyUserData(req);
  if (!userId) return null;

  const [user] = await sql`
    SELECT id, role FROM "user" WHERE id = ${userId} LIMIT 1
  `;

  if (!user || user.role !== 'admin') return null;
  return user;
}