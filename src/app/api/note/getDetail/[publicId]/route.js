import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

function sameUser(left, right) {
    return String(left) === String(right);
}

export async function GET(req, { params }) {
    try {
        const userId = await verifyUserData(req);
        if (userId === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { publicId } = await params;
        const [detail] = await sql`
            SELECT n.*,
                sg.owner_id AS group_owner_id,
                CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
                    'id', c.id,
                    'course_name', c.course_name,
                    'period_label', c.period_label,
                    'color', c.color,
                    'owned_by_viewer', c.user_id = ${userId}
                ) END AS categorization,
                EXISTS (
                    SELECT 1 FROM note_access na
                    WHERE na.note_id = n.id AND na.user_id = ${userId}
                ) AS has_access,
                EXISTS (
                    SELECT 1 FROM group_member gm
                    WHERE gm.group_id = n.group_id AND gm.user_id = ${userId}
                ) AS is_group_member
            FROM note n
            LEFT JOIN student_group sg ON sg.id = n.group_id
            LEFT JOIN categorization c ON c.id = n.categorization_id
            WHERE n.public_id = ${publicId}
        `;

        if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const isGenerator = sameUser(detail.user_id, userId);
        const isGroupNote = detail.generation_type === 'group';
        const isGroupOwner = isGroupNote && sameUser(detail.group_owner_id, userId);
        const hasAccess = Boolean(detail.has_access);
        const isGroupMember = Boolean(detail.is_group_member);

        if (isGroupNote) {
            if (!isGenerator && !isGroupOwner && !hasAccess && !isGroupMember) {
                return NextResponse.json({ error: "Not found" }, { status: 404 });
            }

            detail.can_manage = isGenerator || isGroupOwner;
            detail.is_unlocked = isGenerator || isGroupOwner || hasAccess;

            if (!detail.is_unlocked) {
                detail.content = null;
                detail.markdown_content = null;
                detail.blocks = null;
                detail.source_content = null;
            }
        } else {
            if (!isGenerator) return NextResponse.json({ error: "Not found" }, { status: 404 });
            detail.can_manage = true;
            detail.is_unlocked = true;
        }

        delete detail.group_owner_id;
        delete detail.has_access;
        delete detail.is_group_member;

        if (detail.transcript_id && !detail.uploaded_filename) {
            const [transcript] = await sql`
                SELECT label
                FROM transcript
                WHERE id = ${detail.transcript_id}
            `;
            if (transcript) detail.transcriptName = transcript.label;
        }

        return NextResponse.json({ detail });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
