import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    app: 'BID Hub Web',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
