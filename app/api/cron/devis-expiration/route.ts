export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { expireOverdueDevis, notifyDevisExpirationWarnings } from '@/lib/services/devis-expiration-service';
import { runApiHandler } from '@/lib/api-guard';

/** Job cron — expiration devis 2 mois + alertes J-15/J-7/J-1. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  return runApiHandler('cron/devis-expiration POST', async () => {
    const [expired, warnings] = await Promise.all([
      expireOverdueDevis(),
      notifyDevisExpirationWarnings(),
    ]);
    return NextResponse.json({ ok: true, expired, warnings });
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
