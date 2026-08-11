export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import {
  detectPackagingAnomalies,
  listPackagingAdmin,
  updatePackagingMargin,
  updatePackagingTemplate,
} from '@/lib/server/modules/packaging/packaging-admin.service';
import { seedPackagingPricingDefaults } from '@/lib/services/packaging-pricing-sync.service';

export const GET = withAuthApi(
  'packaging admin list',
  async (auth, req: NextRequest) => {
    const url = new URL(req.url);
    if (url.searchParams.get('anomalies') === '1') {
      const anomalies = await detectPackagingAnomalies();
      return NextResponse.json({ ok: true, anomalies });
    }
    if (url.searchParams.get('seed') === '1') {
      // Seed = mutation — interdit en lecture seule
      const { requireAnyPermission } = await import('@/lib/auth-utils');
      const writeAuth = await requireAnyPermission('tarifs:write');
      if ('error' in writeAuth) return writeAuth.error;
      const seeded = await seedPackagingPricingDefaults();
      return NextResponse.json({ ok: true, seeded });
    }
    const data = await listPackagingAdmin();
    return NextResponse.json({ ok: true, ...data });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);

export const PATCH = withAuthApi(
  'packaging admin patch',
  async (auth, req: NextRequest) => {
    const body = (await req.json()) as {
      entity?: 'template' | 'margin';
      id?: string;
      data?: Record<string, unknown>;
    };
    if (!body.id || !body.entity || !body.data) {
      return NextResponse.json({ ok: false, error: 'id, entity, data requis' }, { status: 400 });
    }
    const row =
      body.entity === 'margin'
        ? await updatePackagingMargin(body.id, body.data)
        : await updatePackagingTemplate(body.id, body.data);
    return NextResponse.json({ ok: true, row });
  },
  { anyPermissions: ['tarifs:write'] },
);
