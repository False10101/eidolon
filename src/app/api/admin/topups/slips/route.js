import { NextResponse } from "next/server";
import { r2, GetObjectCommand } from "@/lib/r2";
import { requireAdmin } from "../../_lib/requireAdmin";

export async function GET(req) {
    const admin = await requireAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 403 });

    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
        return new NextResponse("Missing path parameter", { status: 400 });
    }

    try {
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;

        const command = new GetObjectCommand({
            Bucket: process.env.R2_SLIP_BUCKET_NAME,
            Key: cleanPath, 
        });

        const r2Response = await r2.send(command);

        return new Response(r2Response.Body, {
            headers: {
                'Content-Type': r2Response.ContentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

    } catch (error) {
        console.error("R2 Fetch Error:", error.name, error.message);
        
        if (error.name === 'NoSuchKey') {
            return new NextResponse("Image not found in bucket", { status: 404 });
        }
        
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}