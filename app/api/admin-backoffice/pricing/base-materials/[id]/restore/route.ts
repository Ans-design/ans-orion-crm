export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { restoreBaseMaterial } from '@/lib/server/modules/pricing/base-material.repository';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyPermission('tarifs:write', 'config:edit_price', 'config:publish');
  if ('error' in auth) return auth.error;

  try {
    const row = await restoreBaseMaterial(params.id);
    await invalidateKpiCaches();
    return NextResponse.json({
      ok: true,
      data: row,
      message: 'Matière restaurée depuis la corbeille',
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: safeErrorMessage(error, 'Restauration impossible'),
          code: 'MATERIAL_RESTORE_ERROR',
        },
      },
      { status: 500 },
    );
  }
}
