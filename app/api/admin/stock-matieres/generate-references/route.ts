export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  ensureMaterialMainReferences,
  type GenerateReferencesMode,
} from '@/lib/server/modules/materials/material-excel-metadata.service';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';

export const POST = withAuthApi(
  'stock-matieres generate-references',
  async (_auth, req) => {
    try {
      const body = (await req.json()) as { mode?: GenerateReferencesMode };
      const mode: GenerateReferencesMode = body.mode === 'all' ? 'all' : 'missing';
      const result = await ensureMaterialMainReferences(mode);
      await invalidateKpiCaches();
      return NextResponse.json({ ok: true, data: { ...result, mode } });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Génération références impossible'),
            code: 'GENERATE_REFERENCES_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price', 'config:publish'] },
);
