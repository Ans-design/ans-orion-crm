/**
 * Lookup prix d’entrée articles — snapshot Catalogue Articles 2026 Excel (SoT audit).
 * Client-safe (JSON) ; régénérer via `npx tsx scripts/export-catalogue-2026-price-lookups.ts`.
 */

import articlePrices from '@/data/references/catalogue-articles-2026-entry-prices.json';
import { normalizeCataloguePriceKey } from '@/lib/backoffice/catalogue-2026-price-key';

type ArticleSnap = {
  byPosId: Record<string, number>;
  byArticleName: Record<string, number>;
};

const snap = articlePrices as ArticleSnap;

/** Min « à partir de » pour un parent POS (Catalogue Articles 2026). */
export function lookupCatalogueArticles2026EntryByPosId(posId: string | null | undefined): number | null {
  const id = String(posId ?? '').trim();
  if (!id) return null;
  const n = snap.byPosId[id];
  return n != null && n > 0 ? Math.round(n) : null;
}

/** Min par libellé article Excel (ex. « Carte de visite », « Flyer A5 »). */
export function lookupCatalogueArticles2026EntryByName(name: string | null | undefined): number | null {
  const key = normalizeCataloguePriceKey(name);
  if (!key) return null;
  const exact = snap.byArticleName[key];
  if (exact != null && exact > 0) return Math.round(exact);

  for (const [articleKey, price] of Object.entries(snap.byArticleName)) {
    if (key.includes(articleKey) || articleKey.includes(key)) {
      if (price > 0) return Math.round(price);
    }
  }
  return null;
}

/**
 * Prix imprimé d’entrée : parent POS → sinon libellé commercial.
 */
export function resolveCatalogueArticles2026PrintedEntry(opts: {
  posId?: string | null;
  reference?: string | null;
  excelId?: string | null;
  name?: string | null;
}): number | null {
  for (const candidate of [opts.posId, opts.reference, opts.excelId]) {
    const byPos = lookupCatalogueArticles2026EntryByPosId(candidate);
    if (byPos != null) return byPos;
  }
  return lookupCatalogueArticles2026EntryByName(opts.name);
}
