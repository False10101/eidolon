import { sql } from "@/lib/storage/db";

export function normalizeCategoryColor(color) {
    const value = String(color || '').trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value : '#00d4c8';
}

export async function resolveCategorization(userId, categorizationId) {
    if (!categorizationId) return null;

    const id = Number.parseInt(categorizationId, 10);
    if (!Number.isInteger(id) || id <= 0) return null;

    const rows = await sql`
        SELECT id
        FROM categorization
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
    `;

    return rows[0]?.id ?? null;
}
