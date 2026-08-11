export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { upsertTarifSchema } from '@/lib/server/modules/tarifs/tarifs.validation';
import {
  listTarifs,
  parseTarifListQuery,
  upsertTarifRecord,
} from '@/lib/server/modules/tarifs/tarifs.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('tarifs GET', async () => {
    const tarifs = await listTarifs(parseTarifListQuery(req.nextUrl.searchParams));
    return NextResponse.json(tarifs);
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('tarifs POST', async (): Promise<Response> => {
    const parsed = parseBody(upsertTarifSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const tarif = await upsertTarifRecord(parsed.data, {
      userId: auth.userId,
      userName: auth.userName,
    });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'Tarif',
      entityId: tarif.id,
      entityLabel: `${tarif.articleLabel} (palier ${tarif.palier})`,
      details: { prixUnitaire: tarif.prixUnitaire, palier: tarif.palier },
    });

    return NextResponse.json(tarif);
  });
}
