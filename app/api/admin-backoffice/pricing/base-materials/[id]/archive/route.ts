export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { archiveBaseMaterial } from '@/lib/server/modules/pricing/base-material.repository';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const row = await archiveBaseMaterial(params.id);
    try {
      const { withdrawMaterialFromPos } = await import('@/lib/services/admin-data-sync.service');
      await withdrawMaterialFromPos(params.id, {
        userId: auth.userId,
        userName: auth.userName,
      });
    } catch {
      /* best-effort */
    }
    return NextResponse.json({
      ok: true,
      data: row,
      message: 'Matière archivée — conservée pour l\'historique',
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Archivage impossible') },
      { status: 500 },
    );
  }
}
