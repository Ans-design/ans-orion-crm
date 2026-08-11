export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { apiError } from '@/lib/api-response';
import { getEntityExcelModule, type EntityExcelId } from '@/lib/crm/entity-excel-modules';
import { importEntityRows } from '@/lib/server/modules/entity-data/entity-data.service';
import { resolveParams } from '@/lib/api/route-params';

export async function POST(
  req: NextRequest,
  ctx: { params: { entity: string } | Promise<{ entity: string }> },
) {
  const { entity } = await resolveParams(ctx.params);
  const mod = getEntityExcelModule(entity);
  if (!mod) {
    return NextResponse.json({ error: 'Module inconnu' }, { status: 404 });
  }
  if (!mod.allowImport) {
    return apiError('Import massif interdit pour le ledger', 403);
  }

  const auth = await requirePermission(mod.permissionWrite);
  if ('error' in auth) return auth.error;

  return runApiHandler(`entity-data/${entity}/import`, async () => {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return apiError('Fichier Excel requis', 400);
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const report = await importEntityRows(entity as EntityExcelId, buf);
    return NextResponse.json({ ok: true, data: report });
  });
}
