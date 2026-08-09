import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { requireAdmin } from "../_lib/requireAdmin";

export async function GET(req) {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // 1. Explicitly select group data.
    // 2. Alias the owner's data.
    // 3. Aggregate the group members into a JSON array.
    const groupList = await sql`
        SELECT 
            g.id,
            g.name,
            g.member_count,
            g.created_at,
            g.invite_code,
            u.username AS owner_username,
            COALESCE(
                (
                    SELECT json_agg(json_build_object(
                        'id', u2.id, 
                        'username', u2.username, 
                        'email', u2.email
                    ))
                    FROM group_member gm
                    JOIN "user" u2 ON u2.id = gm.user_id
                    WHERE gm.group_id = g.id
                ), 
                '[]'::json
            ) AS members
        FROM student_group g
        LEFT JOIN "user" u ON u.id = g.owner_id
        ORDER BY g.created_at DESC
    `;

    // Map it to match what the frontend expects
    const formattedGroups = groupList.map(g => ({
        ...g,
        memberCount: g.member_count,
        isActive: true, // Compute this based on your logic
        totalSpent: 0,  // Add your logic to compute this
        totalGenerations: 0 // Add your logic to compute this
    }));

    return NextResponse.json({ groups: formattedGroups });
}
