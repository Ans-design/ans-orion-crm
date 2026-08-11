import { prisma } from '@/lib/prisma';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';

/** Lignes Excel complètes : PRIX + PALIER + FORMULE par article. */
export async function buildPricingArticlesExportRows(): Promise<Record<string, unknown>[]> {
  const profiles = await prisma.articlePricingProfile.findMany({
    where: { active: true },
    include: {
      discountTiers: { where: { active: true }, orderBy: { minQty: 'asc' } },
      formulaVersions: { orderBy: { version: 'desc' }, take: 1 },
    },
    orderBy: { articleLabel: 'asc' },
  });

  const rows: Record<string, unknown>[] = [];
  let seq = 0;

  for (const p of profiles) {
    seq += 1;
    const formula = p.formulaVersions[0];
    rows.push({
      TYPE: 'PRIX',
      ARTICLE: p.articleLabel,
      RÉFÉRENCE: p.articleId,
      'TYPE PRIX': p.calculationType,
      VALEUR: p.prixBase ?? '',
      UNITÉ: p.saleUnit,
      FORMULE: formula?.status ?? 'none',
      PALIER: p.discountTiers.length ? `${p.discountTiers.length} palier(s)` : '',
      STATUT: p.status,
      ID: formatExcelRowId(seq),
    });

    if (formula?.expression && formula.expression !== 'base + options') {
      seq += 1;
      rows.push({
        TYPE: 'FORMULE',
        ARTICLE: p.articleLabel,
        RÉFÉRENCE: p.articleId,
        'TYPE PRIX': '',
        VALEUR: '',
        UNITÉ: '',
        FORMULE: formula.expression,
        PALIER: '',
        STATUT: formula.status,
        ID: formatExcelRowId(seq),
      });
    }

    for (const tier of p.discountTiers) {
      seq += 1;
      rows.push({
        TYPE: 'PALIER',
        ARTICLE: p.articleLabel,
        RÉFÉRENCE: p.articleId,
        'TYPE PRIX': '',
        VALEUR: tier.unitPrice ?? tier.discountPercent ?? '',
        UNITÉ: p.saleUnit,
        FORMULE: '',
        PALIER: tier.minQty,
        'QTÉ MIN': tier.minQty,
        'QTÉ MAX': tier.maxQty ?? '',
        MODE: tier.discountPercent ? 'percent' : 'unit_price',
        STATUT: tier.active ? 'actif' : 'inactif',
        ID: formatExcelRowId(seq),
      });
    }
  }

  return rows;
}
