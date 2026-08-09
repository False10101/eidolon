import { NextResponse } from "next/server";
import { sql } from "@/lib/storage/db";
import { verifyUserData } from "@/lib/auth/verify";


export async function GET(req) {
    try {
        const userId = await verifyUserData(req);

        if (userId === null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rows = await sql`SELECT balance, free_generations_remaining from "user" where id = ${userId}`;
        const user = rows[0];

        return NextResponse.json({ balance: user.balance, free_generations_remaining: user.free_generations_remaining });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}