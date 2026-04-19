import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";

export async function GET(req){
    try {
        const userId = await verifyUserData(req);

        if(userId === null){
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rows = await sql`SELECT label, public_id, duration, created_at from "transcript" where user_id = ${userId} ORDER BY created_at DESC`;

        return NextResponse.json({ history : rows });
    } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}