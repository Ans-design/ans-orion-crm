export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { processOutboxBatch } from '@/lib/server/outbox-worker';

/**
 * Cron / worker outbox V12 — authentifié via CRON_SECRET.
 * Borné, idempotent, monitorable.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim().length < 16) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 });
  }
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    req.headers.get('x-cron-secret');
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const { ensureOutboxHandlersRegistered } = await import('@/lib/server/outbox-handlers');
    ensureOutboxHandlersRegistered();
    const result = await processOutboxBatch({
      workerId: `cron-${Date.now()}`,
      limit: 20,
    });
    return NextResponse.json({
      ok: true,
      ...result,
      sync: {
        status: result.dead > 0 || result.failed > 0 ? 'PARTIAL' : 'SYNCED',
        pendingProjections: [],
        warnings: result.dead > 0 ? [`${result.dead} dead letter(s)`] : [],
      },
    });
  } catch (err) {
    console.error('[cron/outbox]', err);
    return NextResponse.json(
      { ok: false, error: { message: 'Outbox worker failed', code: 'OUTBOX_WORKER' } },
      { status: 500 },
    );
  }
}
