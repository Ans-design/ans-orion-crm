export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { CATALOGUE } from '@/lib/data/catalogue';
import { prisma } from '@/lib/prisma';
import { getDynamicPricingStats } from '@/lib/pricing/publish-dynamic-pricing';
import { countAnomaliesBySeverity, scanPricingAnomalies } from '@/lib/pricing/pricing-anomalies';
import { runApiHandler } from '@/lib/api-guard';

export async function GET() {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('pricing/overview GET', async () => {
    const [stats, anomalies, salePrices2026, salePrices2026Active, fusionAnomaliesOpen, publishedProfiles, familyGroups] =
      await Promise.all([
        getDynamicPricingStats(),
        scanPricingAnomalies(300),
        prisma.salePrice2026.count().catch(() => 0),
        prisma.salePrice2026.count({ where: { actif: true } }).catch(() => 0),
        prisma.importAnomaly.count({ where: { resolved: false } }).catch(() => 0),
        prisma.articlePricingProfile.count({ where: { status: 'published' } }),
        prisma.articlePricingProfile
          .groupBy({ by: ['family', 'status'], _count: { _all: true } })
          .catch(() => [] as { family: string | null; status: string | null; _count: { _all: number } }[]),
      ]);

    const anomalyCounts = countAnomaliesBySeverity(anomalies);
    const profileCount = stats.profiles;
    const withoutPublishedFormula = Math.max(0, CATALOGUE.length - publishedProfiles);
    const withoutProfile = Math.max(0, CATALOGUE.length - profileCount);

    // Couverture par moteur — agrégation profils par famille (données réelles).
    const familyMap = new Map<string, { family: string; profiles: number; published: number; draft: number }>();
    for (const g of familyGroups) {
      const family = (g.family ?? '').trim() || 'Sans famille';
      const entry = familyMap.get(family) ?? { family, profiles: 0, published: 0, draft: 0 };
      entry.profiles += g._count._all;
      if (g.status === 'published') entry.published += g._count._all;
      else if (g.status === 'draft') entry.draft += g._count._all;
      familyMap.set(family, entry);
    }
    const families = [...familyMap.values()].sort((a, b) => b.profiles - a.profiles);

    return NextResponse.json({
      stats: {
        catalogueArticles: CATALOGUE.length,
        dynamicProfiles: profileCount,
        publishedProfiles: stats.published,
        draftProfiles: stats.draft,
        withoutPublishedFormula,
        withoutProfile,
        optionGroups: stats.optionGroups,
        formulas: stats.formulas,
        stockRules: stats.stockRules,
        urgencyRules: stats.urgencyRules,
        materialPrices: stats.materialPrices,
        salePrices2026,
        salePrices2026Active,
        anomaliesCritical: anomalyCounts.critical,
        anomaliesWarning: anomalyCounts.warning,
        anomaliesInfo: anomalyCounts.info,
        fusionAnomaliesOpen,
      },
      families,
      anomaliesPreview: anomalies.slice(0, 8),
    });
  }, {
    fallback: {
      stats: {
        catalogueArticles: 0,
        dynamicProfiles: 0,
        publishedProfiles: 0,
        draftProfiles: 0,
        withoutPublishedFormula: 0,
        withoutProfile: 0,
        optionGroups: 0,
        formulas: 0,
        stockRules: 0,
        urgencyRules: 0,
        materialPrices: 0,
        salePrices2026: 0,
        salePrices2026Active: 0,
        anomaliesCritical: 0,
        anomaliesWarning: 0,
        anomaliesInfo: 0,
        fusionAnomaliesOpen: 0,
      },
      families: [],
      anomaliesPreview: [],
    },
  });
}
