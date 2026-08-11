export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * AUTH-005 — health public minimal pour load balancer.
 * Diagnostic détaillé : /api/health/system (auth admin).
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
