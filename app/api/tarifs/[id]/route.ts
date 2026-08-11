export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { runApiHandler } from '@/lib/api-guard';
import { deactivateTarif } from '@/lib/server/modules/tarifs/tarifs.service';
import { resolveParams } from '@/lib/api/route-params';

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('tarifs/[id] DELETE', async () => {
    const tarif = await deactivateTarif(id);

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'DELETE',
      entity: 'Tarif',
      entityId: tarif.id,
      entityLabel: `${tarif.articleLabel} (palier ${tarif.palier})`,
    });

    return NextResponse.json({ success: true });
  });
}
