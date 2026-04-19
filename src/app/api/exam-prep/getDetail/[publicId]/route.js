import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req, { params }) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { publicId } = await params;

    // own exam prep
    let [examPrep] = await sql`
        SELECT id, label, status, created_at, charge_amount, question_type, difficulty, content
        FROM exam_prep
        WHERE public_id = ${publicId} AND user_id = ${userId}
    `;

    // check group access
    if (!examPrep) {
        const accessRows = await sql`
            SELECT ep.id, ep.label, ep.status, ep.created_at, ep.charge_amount, ep.question_type, ep.difficulty, ep.content
            FROM exam_prep ep
            JOIN exam_prep_access epa ON epa.exam_prep_id = ep.id
            WHERE epa.user_id = ${userId} AND ep.public_id = ${publicId}
        `;
        examPrep = accessRows[0];
    }

    if (!examPrep) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let questions = [];
    try {
        const parsed = JSON.parse(examPrep.content);
        questions = parsed.questions ?? [];
    } catch (err) {
        console.error('Failed to parse exam prep content:', err);
    }

    const sources = await sql`
        SELECT 
            eps.source_type,
            eps.file_name,
            n.name AS note_name,
            n.public_id AS note_public_id
        FROM exam_prep_sources eps
        LEFT JOIN note n ON eps.source_note_id = n.id
        WHERE eps.exam_prep_id = ${examPrep.id}
    `;

    const formattedSources = sources.map(s => ({
        source_type: s.source_type,
        name: s.source_type === 'note' ? s.note_name : s.file_name,
        note_public_id: s.note_public_id ?? null,
    }));

    return NextResponse.json({
        label: examPrep.label,
        status: examPrep.status,
        created_at: examPrep.created_at,
        charge_amount: examPrep.charge_amount,
        question_type: examPrep.question_type,
        difficulty: examPrep.difficulty,
        questions,
        sources: formattedSources,
    });
}