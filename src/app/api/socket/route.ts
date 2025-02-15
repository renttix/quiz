import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'Socket server is running' });
}

export const dynamic = 'force-dynamic';
