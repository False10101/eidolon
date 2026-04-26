import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { rateLimit } from "@/lib/rateLimit";

export async function requireAdmin(req) {
  const userId = await verifyUserData(req);
  if (!userId) return null;

  const limited = await rateLimit(`rl:admin:${userId}`, 60, 60);
  if (limited) return null;

  const [user] = await sql`
    SELECT id, role FROM "user" WHERE id = ${userId} LIMIT 1
  `;

  if (!user || user.role !== 'admin') return null;
  return user;
}