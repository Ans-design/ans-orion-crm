export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

import { NextResponse } from 'next/server';
import { probeReadiness } from '@/lib/monitoring/ready-probe';

/** GET /api/health/ready — readiness (app + DB + env) pour CI / load balancers. */
export async function GET() {
  const report = await probeReadiness();
  return NextResponse.json({ ok: report.ok, data: report }, { status: report.ok ? 200 : 503 });
}
