import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { normalizeCategoryColor } from "@/lib/categories";

export async function GET(req) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await sql`
        SELECT id, course_name, period_label, color, created_at
        FROM categorization
        WHERE user_id = ${userId}
        ORDER BY created_at DESC, id DESC
    `;

    return NextResponse.json({ categories: rows });
}

export async function POST(req) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const courseName = String(body.course_name || '').trim();
    const periodLabel = String(body.period_label || '').trim();
    const color = normalizeCategoryColor(body.color);

    if (!courseName || !periodLabel) {
        return NextResponse.json({ error: "Course and period are required." }, { status: 400 });
    }

    const row = await sql.begin(async (tx) => {
        // categorization.id has no sequence/default in the live schema, so serialize ID allocation.
        await tx`SELECT pg_advisory_xact_lock(hashtext('categorization-id-allocation'))`;

        const [existing] = await tx`
            SELECT id
            FROM categorization
            WHERE user_id = ${userId}
              AND course_name = ${courseName}
              AND period_label = ${periodLabel}
            LIMIT 1
        `;

        if (existing) {
            const [updated] = await tx`
                UPDATE categorization
                SET color = ${color}, updated_at = NOW()
                WHERE id = ${existing.id}
                RETURNING id, course_name, period_label, color, created_at
            `;
            return updated;
        }

        const [next] = await tx`SELECT COALESCE(MAX(id), 0) + 1 AS id FROM categorization`;
        const [created] = await tx`
            INSERT INTO categorization (
                id, user_id, course_name, period_label, color, created_at, updated_at
            )
            VALUES (${next.id}, ${userId}, ${courseName}, ${periodLabel}, ${color}, NOW(), NOW())
            RETURNING id, course_name, period_label, color, created_at
        `;
        return created;
    });

    return NextResponse.json({ category: row });
}
