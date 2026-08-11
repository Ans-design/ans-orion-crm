export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { syncDynamicPricingFromCatalogue } from '@/lib/pricing/sync-dynamic-pricing';
import { getDynamicPricingStats } from '@/lib/pricing/publish-dynamic-pricing';
import { runApiHandler } from '@/lib/api-guard';
import { logAudit } from '@/lib/audit';
import { parseBody } from '@/lib/validators/common';
import { apiError } from '@/lib/api-response';
import { dynamicPricingSyncActionSchema } from '@/lib/server/modules/pricing/dynamic-pricing-api.validation';

export async function GET() {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('dynamic-pricing GET', async () => {
    const stats = await getDynamicPricingStats();
    const profiles = await prisma.articlePricingProfile.findMany({
        orderBy: [{ family: 'asc' }, { articleLabel: 'asc' }],
        select: {
          articleId: true,
          articleLabel: true,
          family: true,
          calculationType: true,
          status: true,
          prixBase: true,
          qtyMin: true,
          saleUnit: true,
          updatedAt: true,
          discountTiers: {
            where: { active: true },
            select: {
              unitPrice: true,
              discountPercent: true,
              active: true,
            },
            orderBy: { minQty: 'asc' },
          },
          formulaVersions: {
            select: { version: true, status: true, variables: true },
            orderBy: { version: 'desc' },
            take: 1,
          },
          optionGroups: {
            where: { active: true },
            select: { visiblePos: true, label: true },
            take: 8,
          },
          _count: {
            select: {
              materialPrices: true,
              optionGroups: true,
              stockRules: true,
              formulaVersions: true,
            },
          },
        },
        take: 500,
      });
    return NextResponse.json({ stats, profiles });
  }, {
    fallback: {
      stats: {
        profiles: 0,
        published: 0,
        draft: 0,
        optionGroups: 0,
        formulas: 0,
        stockRules: 0,
        urgencyRules: 0,
        materialPrices: 0,
      },
      profiles: [],
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  const parsed = parseBody(dynamicPricingSyncActionSchema, await req.json().catch(() => ({})));
  if (!parsed.ok) return apiError(parsed.error, 400);

  if (parsed.data.action === 'sync') {
    return runApiHandler('dynamic-pricing sync', async () => {
      const result = await syncDynamicPricingFromCatalogue();
      await logAudit({
        userId: auth.userId,
        userName: auth.userName,
        action: 'UPDATE',
        entity: 'ArticlePricingProfile',
        entityLabel: 'Sync tarification dynamique',
        details: result,
      });
      return NextResponse.json({ success: true, ...result });
    }, { fallback: { success: false } });
  }

  return NextResponse.json({ error: 'action inconnue' }, { status: 400 });
}
