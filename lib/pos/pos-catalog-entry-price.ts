/**
 * Prix d’entrée affiché sur les cartes POS (« À partir de »).
 * Sources runtime : moteurs métier dédiés uniquement (doypack/gobelet/tampon/photobook).
 * Interdit : catalogue.ts prixDepart, grilles PRIX 2026 stub, JSON Articles 2026.
 * Admin / audit : lookupCatalogueArticles2026EntryByPosId (hors chemin POS).
 */

import { getDefaultDoypackBlanks } from '@/lib/packaging/doypack-price';
import { getDefaultCupBlanks } from '@/lib/packaging/custom-cup-price';
import { getStampFormatsRuntime } from '@/lib/pricing/stamp-pricing';
import { getPhotobookRuntimeParams } from '@/lib/pricing/photobook-pricing';

/** Prix minimum vierge doypack (signal catalogue). */
export function entryDoypackPrice(): number | null {
  const prices = getDefaultDoypackBlanks()
    .map((b) => b.prixViergeHt)
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** Prix minimum vierge gobelet. */
export function entryGobeletPrice(): number | null {
  const prices = getDefaultCupBlanks()
    .map((b) => b.prixViergeHt)
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
}

function entryStampPrice(): number | null {
  const formats = getStampFormatsRuntime();
  const prices = formats
    .map((f) => Number(f.unitPrice ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
}

function entryPhotobookPrice(): number | null {
  const p = getPhotobookRuntimeParams();
  const page = Number(p.prixPageA4 ?? 0);
  if (!Number.isFinite(page) || page <= 0) return null;
  return Math.round(page * 20);
}

/**
 * Résout le prix d’entrée hors DB (moteurs spéciaux uniquement).
 * DB / profils publiés d’abord via le builder catalogue POS.
 */
export function resolvePosCatalogEntryPrice(articleId: string): number | null {
  const id = String(articleId ?? '').trim();
  if (!id) return null;

  if (id === 'pkg-doypack') return entryDoypackPrice();
  if (id === 'pkg-gobelet') return entryGobeletPrice();
  if (id === 'doc-tampon' || /^stamp/i.test(id)) return entryStampPrice();
  if (id === 'ph-photobook') return entryPhotobookPrice();

  return null;
}
