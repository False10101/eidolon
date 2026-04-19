export async function GET(req) {
    const userId = await verifyUserData(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const [user] = await sql`SELECT line_user_id FROM "user" WHERE id = ${userId}`;
    return NextResponse.json({ connected: !!user.line_user_id });
}