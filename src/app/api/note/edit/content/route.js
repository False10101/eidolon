import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";
import { resolveCategorization } from "@/lib/categories";

function sameUser(left, right) {
    return String(left) === String(right);
}

export async function PATCH(req) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { content, publicId, name } = body;
        const hasCategoryUpdate = Object.prototype.hasOwnProperty.call(body, 'categorizationId');
        const [note] = await sql`
            SELECT n.id, n.user_id, n.generation_type, n.status,
                sg.owner_id AS group_owner_id
            FROM note n
            LEFT JOIN student_group sg ON sg.id = n.group_id
            WHERE n.public_id = ${publicId}
        `;
        if (!note) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

        const isGenerator = sameUser(note.user_id, userId);
        const isGroupOwner = note.generation_type === 'group' && sameUser(note.group_owner_id, userId);
        if (!isGenerator && !isGroupOwner) {
            return NextResponse.json({ error: 'Not authorized to edit this note.' }, { status: 403 });
        }
        if (note.status !== 'completed') {
            return NextResponse.json({ error: 'Cannot edit a note while it is being generated.' }, { status: 400 });
        }

        let categorizationId = null;
        if (hasCategoryUpdate && body.categorizationId !== null) {
            categorizationId = await resolveCategorization(userId, body.categorizationId);
            if (!categorizationId) {
                return NextResponse.json({ error: 'You can only assign one of your own categories.' }, { status: 400 });
            }
        }

        const [updated] = await sql`
            UPDATE note
            SET content = ${content},
                name = ${name},
                categorization_id = CASE
                    WHEN ${hasCategoryUpdate} THEN ${categorizationId}
                    ELSE categorization_id
                END
            WHERE id = ${note.id} AND status = 'completed'
            RETURNING id
        `;
        if (!updated) {
            return NextResponse.json({ error: 'Cannot edit a note while it is being generated.' }, { status: 400 });
        }
        return NextResponse.json({ success: true, categorizationId: hasCategoryUpdate ? categorizationId : undefined });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
