export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getSyncDiagnosticsBundle } from '@/lib/services/sync.service';
import { safeErrorMessage } from '@/lib/api-response';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const { summary, diagnostics, driftReport } = await getSyncDiagnosticsBundle();
    return NextResponse.json({ ok: true, summary, diagnostics, driftReport });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Diagnostics sync indisponibles') },
      { status: 503 },
    );
  }
}
