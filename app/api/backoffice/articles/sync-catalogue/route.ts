export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { syncCatalogueProfilesToDb } from '@/lib/services/catalogue-sync-service';
import { logAudit } from '@/lib/audit';
import { safeErrorMessage } from '@/lib/api-response';

export async function POST() {
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    const result = await syncCatalogueProfilesToDb();

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'SYNC_CATALOGUE_DB',
      entity: 'ArticlePricingProfile',
      entityLabel: 'catalogue-sync',
      details: result,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, 'Synchronisation catalogue impossible') },
      { status: 503 },
    );
  }
}
