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
        const { publicId, label, content, clearSegments } = body;
        const hasCategoryUpdate = Object.prototype.hasOwnProperty.call(body, 'categorizationId');
        if (!publicId) return NextResponse.json({ error: 'publicId is required.' }, { status: 400 });

        const [transcript] = await sql`
            SELECT t.id, t.user_id, t.generation_type, t.status,
                sg.owner_id AS group_owner_id
            FROM transcript t
            LEFT JOIN student_group sg ON sg.id = t.group_id
            WHERE t.public_id = ${publicId}
        `;
        if (!transcript) return NextResponse.json({ error: 'Transcript not found.' }, { status: 404 });

        const isGenerator = sameUser(transcript.user_id, userId);
        const isGroupOwner = transcript.generation_type === 'group'
            && sameUser(transcript.group_owner_id, userId);
        const canEdit = isGenerator || isGroupOwner;
        if (!canEdit) return NextResponse.json({ error: 'Only the group owner or transcript generator can edit this transcript.' }, { status: 403 });
        if (transcript.status !== 'Completed') {
            return NextResponse.json({ error: 'Cannot edit a transcript while it is being generated.' }, { status: 400 });
        }

        let categorizationId = null;
        if (hasCategoryUpdate && body.categorizationId !== null) {
            categorizationId = await resolveCategorization(userId, body.categorizationId);
            if (!categorizationId) {
                return NextResponse.json({ error: 'You can only assign one of your own categories.' }, { status: 400 });
            }
        }

        if (clearSegments) {
            const [updated] = await sql`
                UPDATE transcript
                SET label = ${label},
                    content = ${content},
                    segments = NULL,
                    output_format = 'text',
                    categorization_id = CASE
                        WHEN ${hasCategoryUpdate} THEN ${categorizationId}
                        ELSE categorization_id
                    END
                WHERE id = ${transcript.id} AND status = 'Completed'
                RETURNING id
            `;
            if (!updated) return NextResponse.json({ error: 'Cannot edit a transcript while it is being generated.' }, { status: 400 });
        } else {
            const [updated] = await sql`
                UPDATE transcript
                SET label = ${label},
                    content = ${content},
                    categorization_id = CASE
                        WHEN ${hasCategoryUpdate} THEN ${categorizationId}
                        ELSE categorization_id
                    END
                WHERE id = ${transcript.id} AND status = 'Completed'
                RETURNING id
            `;
            if (!updated) return NextResponse.json({ error: 'Cannot edit a transcript while it is being generated.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, categorizationId: hasCategoryUpdate ? categorizationId : undefined });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
