import { CATALOGUE, CAT_LABELS } from '@/lib/data/catalogue';
import { prisma } from '@/lib/prisma';
import { inferCalculationType } from '@/lib/pricing/config-to-dynamic-pricing';
import { getProductConfig } from '@/lib/data/config-types';

export type CatalogueSyncResult = {
  scanned: number;
  created: number;
  skipped: number;
  errors: string[];
};

/**
 * Crée des profils tarifaires brouillon pour les articles catalogue absents de la DB.
 * Non destructif — ne modifie pas les profils existants.
 */
export async function syncCatalogueProfilesToDb(): Promise<CatalogueSyncResult> {
  const result: CatalogueSyncResult = {
    scanned: CATALOGUE.length,
    created: 0,
    skipped: 0,
    errors: [],
  };

  let existing: Set<string>;
  try {
    const rows = await prisma.articlePricingProfile.findMany({
      select: { articleId: true },
    });
    existing = new Set(rows.map((r) => r.articleId));
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : 'DB inaccessible');
    return result;
  }

  for (const item of CATALOGUE) {
    if (existing.has(item.id)) {
      result.skipped++;
      continue;
    }

    try {
      const cfg = getProductConfig(item.id, item.configType);
      if (!cfg) {
        result.errors.push(`${item.id}: config introuvable`);
        continue;
      }
      const calculationType = inferCalculationType(item.id, cfg);
      const family = CAT_LABELS[item.category] || item.category;

      await prisma.articlePricingProfile.create({
        data: {
          articleId: item.id,
          articleLabel: item.name,
          family,
          calculationType,
          saleUnit: calculationType === 'm2' || calculationType === 'laize' ? 'm²' : 'pièce',
          status: 'draft',
          prixBase: item.prixDepart ?? null,
          active: true,
          source: 'catalogue-sync',
        },
      });
      result.created++;
      existing.add(item.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('déjà existant') || msg.includes('Unique constraint')) {
        result.skipped++;
      } else {
        result.errors.push(`${item.id}: ${msg}`);
      }
    }
  }

  return result;
}
