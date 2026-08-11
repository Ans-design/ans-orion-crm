export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { reorganizeMaterialExcelIds } from '@/lib/server/modules/materials/material-excel-metadata.service';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';

export const POST = withAuthApi(
  'stock-matieres reorganize-excel-ids',
  async () => {
    try {
      const result = await reorganizeMaterialExcelIds();
      await invalidateKpiCaches();
      return NextResponse.json({ ok: true, data: result });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Réorganisation ID impossible'),
            code: 'REORGANIZE_IDS_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price', 'config:publish'] },
);
