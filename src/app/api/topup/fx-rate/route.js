import { NextResponse } from 'next/server';
import { getFxResponseForRequest } from '@/lib/topup/fx';

export async function GET(req) {
    return NextResponse.json(await getFxResponseForRequest(req));
}
