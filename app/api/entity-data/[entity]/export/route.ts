export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { getEntityExcelModule, type EntityExcelId } from '@/lib/crm/entity-excel-modules';
import { exportEntityRows } from '@/lib/server/modules/entity-data/entity-data.service';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(
  req: NextRequest,
  ctx: { params: { entity: string } | Promise<{ entity: string }> },
) {
  const { entity } = await resolveParams(ctx.params);
  const mod = getEntityExcelModule(entity);
  if (!mod) {
    return NextResponse.json({ error: 'Module inconnu' }, { status: 404 });
  }

  const auth = await requirePermission(mod.permissionRead);
  if ('error' in auth) return auth.error;

  return runApiHandler(`entity-data/${entity}/export`, async () => {
    const trash = new URL(req.url).searchParams.get('archived') === '1'
      || new URL(req.url).searchParams.get('trash') === '1';
    const { buffer, fileStem, count } = await exportEntityRows(entity as EntityExcelId, trash);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileStem}.xlsx"`,
        'X-Export-Count': String(count),
      },
    });
  });
}
