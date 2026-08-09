import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

function sameUser(left, right) {
    return String(left) === String(right);
}

export async function GET(req, { params }) {
    try {
        const userId = await verifyUserData(req);

        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { publicId } = await params;

        const [detail] = await sql`
            SELECT t.*,
                sg.owner_id AS group_owner_id,
                EXISTS (
                    SELECT 1 FROM transcript_access ta
                    WHERE ta.transcript_id = t.id AND ta.user_id = ${userId}
                ) AS has_access,
                EXISTS (
                    SELECT 1 FROM group_member gm
                    WHERE gm.group_id = t.group_id AND gm.user_id = ${userId}
                ) AS is_group_member
            FROM transcript t
            LEFT JOIN student_group sg ON sg.id = t.group_id
            WHERE t.public_id = ${publicId}
        `;

        if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const isGenerator = sameUser(detail.user_id, userId);
        const isGroupTranscript = detail.generation_type === 'group';
        const isGroupOwner = isGroupTranscript && sameUser(detail.group_owner_id, userId);
        const hasAccess = Boolean(detail.has_access);
        const isGroupMember = Boolean(detail.is_group_member);

        if (isGroupTranscript) {
            if (!isGenerator && !isGroupOwner && !hasAccess && !isGroupMember) {
                return NextResponse.json({ error: "Not found" }, { status: 404 });
            }

            detail.can_edit = isGenerator || isGroupOwner;
            detail.is_unlocked = isGenerator || isGroupOwner || hasAccess;

            if (!detail.is_unlocked) {
                detail.content = null;
                detail.segments = null;
            }
        } else {
            if (!isGenerator) return NextResponse.json({ error: "Not found" }, { status: 404 });
            detail.can_edit = true;
            detail.is_unlocked = true;
        }

        delete detail.group_owner_id;
        delete detail.has_access;
        delete detail.is_group_member;

        return NextResponse.json({ detail });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
