/**
 * Audit qualité données — reproductible (local).
 * Usage: npx tsx scripts/audit-data-quality.ts
 * Ne logue aucune donnée personnelle (emails, noms clients) — compteurs uniquement.
 */
process.env.APP_ENV = process.env.APP_ENV || 'local';
process.env.LOCAL_DEV = process.env.LOCAL_DEV || 'true';

import { resolveDatabaseUrl } from '../lib/database-url';
resolveDatabaseUrl();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Finding = { id: string; severity: 'critical' | 'high' | 'medium' | 'info'; count: number; note: string };

async function main() {
  const findings: Finding[] = [];

  const [
    materialsActive,
    materialsSansPrix,
    materialsArchived,
    stockNeg,
    stockZero,
    stockFaible,
    profilesActive,
    profilesDraft,
    profilesArchived,
    finishingActive,
    finishingZero,
    contextPrices,
    contextNeg,
    orphanContext,
    reservations,
  ] = await Promise.all([
    prisma.baseMaterial.count({ where: { archived: false, active: true } }),
    prisma.baseMaterial.count({
      where: {
        archived: false,
        active: true,
        AND: [
          { OR: [{ basePrintPrice: null }, { basePrintPrice: { lte: 0 } }] },
          { OR: [{ maxPrice: null }, { maxPrice: { lte: 0 } }] },
          { contextPrices: { none: { active: true, priceHT: { gt: 0 } } } },
        ],
      },
    }),
    prisma.baseMaterial.count({ where: { archived: true } }),
    prisma.stockItem.count({ where: { actif: true, quantity: { lt: 0 } } }),
    prisma.stockItem.count({ where: { actif: true, archived: false, quantity: { lte: 0 } } }),
    prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
      `SELECT COUNT(*) as c FROM StockItem WHERE actif = 1 AND archived = 0 AND (quantity - COALESCE(reservedQty, 0)) <= minQty`,
    )
      .then((r) => Number(r?.[0]?.c ?? 0))
      .catch(() => 0),
    prisma.articlePricingProfile.count({ where: { active: true, NOT: { status: 'archived' } } }),
    prisma.articlePricingProfile.count({ where: { status: 'draft' } }),
    prisma.articlePricingProfile.count({ where: { status: 'archived' } }),
    prisma.finishingPrice.count({ where: { active: true } }),
    prisma.finishingPrice.count({ where: { active: true, unitPrice: { lte: 0 } } }),
    prisma.materialContextPrice.count({ where: { active: true } }),
    prisma.materialContextPrice.count({ where: { active: true, priceHT: { lt: 0 } } }),
    prisma.materialContextPrice.count({
      where: { material: { is: null } },
    }).catch(() => 0),
    prisma.stockReservation.count().catch(() => 0),
  ]);

  findings.push({
    id: 'materials_active',
    severity: 'info',
    count: materialsActive,
    note: 'Matières actives non archivées',
  });
  findings.push({
    id: 'materials_sans_prix',
    severity: materialsSansPrix > 0 ? 'high' : 'info',
    count: materialsSansPrix,
    note: 'Matières actives sans prix base ni contexte HT > 0',
  });
  findings.push({
    id: 'materials_archived',
    severity: 'info',
    count: materialsArchived,
    note: 'Matières archivées (traçabilité)',
  });
  findings.push({
    id: 'stock_negatif',
    severity: stockNeg > 0 ? 'critical' : 'info',
    count: stockNeg,
    note: 'StockItems actifs avec quantité < 0',
  });
  findings.push({
    id: 'stock_zero',
    severity: stockZero > 0 ? 'medium' : 'info',
    count: stockZero,
    note: 'StockItems actifs à quantité ≤ 0',
  });
  findings.push({
    id: 'stock_faible',
    severity: stockFaible > 0 ? 'medium' : 'info',
    count: stockFaible,
    note: 'StockItems ≤ seuil minQty',
  });
  findings.push({
    id: 'profiles_pos',
    severity: 'info',
    count: profilesActive,
    note: 'Profils pricing articles actifs',
  });
  findings.push({
    id: 'profiles_draft',
    severity: profilesDraft > 0 ? 'medium' : 'info',
    count: profilesDraft,
    note: 'Profils encore en brouillon (ne doivent pas être vendables POS si non publiés)',
  });
  findings.push({
    id: 'finitions_zero',
    severity: finishingZero > 0 ? 'high' : 'info',
    count: finishingZero,
    note: `Finitions actives à prix ≤ 0 (sur ${finishingActive} actives)`,
  });
  findings.push({
    id: 'context_prices_neg',
    severity: contextNeg > 0 ? 'critical' : 'info',
    count: contextNeg,
    note: `Prix contexte négatifs (sur ${contextPrices} actifs)`,
  });
  findings.push({
    id: 'reservations',
    severity: 'info',
    count: reservations,
    note: 'Réservations stock enregistrées',
  });
  findings.push({
    id: 'orphan_context',
    severity: orphanContext > 0 ? 'high' : 'info',
    count: orphanContext,
    note: 'Prix contexte orphelins (si relation null supportée)',
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    limits: [
      'Compteurs locaux uniquement — pas d’export PII',
      'Articles POS catalogue config-types non intégralement croisés ici',
      'Divergences Admin↔POS runtime non recalculées (voir Centre sync)',
    ],
    findings,
    counts: {
      critical: findings.filter((f) => f.severity === 'critical' && f.count > 0).length,
      high: findings.filter((f) => f.severity === 'high' && f.count > 0).length,
      medium: findings.filter((f) => f.severity === 'medium' && f.count > 0).length,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
