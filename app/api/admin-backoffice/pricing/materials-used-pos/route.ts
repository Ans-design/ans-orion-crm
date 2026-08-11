export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { auditMaterialsUsedInPos } from '@/lib/server/modules/pricing/materials-used-pos.audit';
import { isPrismaMissingTableError } from '@/lib/server/modules/pricing/prisma-safe';

const EMPTY_SUMMARY = {
  total: 0,
  missingInBaseDb: 0,
  missingPrice: 0,
  withAnomalies: 0,
};

export async function GET() {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  try {
    const data = await auditMaterialsUsedInPos();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('[admin-backoffice/pricing/materials-used-pos GET]', error);
    if (isPrismaMissingTableError(error)) {
      return NextResponse.json({
        ok: true,
        data: { materials: [], summary: EMPTY_SUMMARY },
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: safeErrorMessage(error, 'Impossible de charger les matières POS'),
          code: 'MATERIALS_LOAD_ERROR',
        },
        data: { materials: [], summary: EMPTY_SUMMARY },
      },
      { status: 500 },
    );
  }
}
