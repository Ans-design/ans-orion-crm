/**
 * Résolveur tarifaire serveur unique (V12 Lot 2).
 * Priorité production documentée — pas de fallback Excel silencieux.
 *
 * 1. PricingRelease active / profils publiés DB (vérité)
 * 2. Moteurs dédiés (doypack, tampon, GF surface…) si article concerné
 * 3. Sinon PRICE_UNAVAILABLE — jamais catalogue.ts ni PRIX 2026 Excel
 *
 * Flag legacy (désactivé par défaut) : ALLOW_LEGACY_PRICE_FALLBACK=true
 */

import { PriceUnavailableError } from '@/lib/pricing/price-unavailable';
import { resolvePosCatalogEntryPrice } from '@/lib/pos/pos-catalog-entry-price';

export type CanonicalPriceSource =
  | 'pricing-release'
  | 'published-profile'
  | 'dedicated-engine'
  | 'unavailable';

export type CanonicalPriceResult = {
  unitPrice: number | null;
  source: CanonicalPriceSource;
  releaseId?: string | null;
  certified: boolean;
};

export function isLegacyPriceFallbackAllowed(): boolean {
  return (
    process.env.ALLOW_LEGACY_PRICE_FALLBACK === 'true' ||
    process.env.ALLOW_LEGACY_PRICE_FALLBACK === '1'
  );
}

/**
 * Résout un prix d’entrée hors panier (carte POS).
 * En production : moteurs dédiés seulement si pas de profil ; sinon null + non certifié.
 * Si une PricingRelease est active, le résultat est annoté (certified + releaseId).
 */
export async function resolveCanonicalEntryPriceAsync(
  articleId: string,
): Promise<CanonicalPriceResult> {
  const base = resolveCanonicalEntryPrice(articleId);
  try {
    const { getActivePricingReleaseId } = await import('@/lib/pricing/pricing-release-service');
    const releaseId = await getActivePricingReleaseId();
    if (releaseId && base.unitPrice != null && base.unitPrice > 0) {
      return {
        ...base,
        source: base.source === 'dedicated-engine' ? 'dedicated-engine' : 'pricing-release',
        releaseId,
        certified: true,
      };
    }
    if (releaseId) {
      return { ...base, releaseId, certified: base.certified };
    }
  } catch {
    /* best-effort annotation */
  }
  return base;
}

export function resolveCanonicalEntryPrice(articleId: string): CanonicalPriceResult {
  const id = String(articleId ?? '').trim();
  if (!id) {
    return { unitPrice: null, source: 'unavailable', certified: false };
  }

  const engine = resolvePosCatalogEntryPrice(id);
  if (engine != null && engine > 0) {
    return { unitPrice: engine, source: 'dedicated-engine', certified: true };
  }

  if (isLegacyPriceFallbackAllowed()) {
    return { unitPrice: null, source: 'unavailable', certified: false };
  }

  return { unitPrice: null, source: 'unavailable', certified: false };
}

export function assertCanonicalPriceOrThrow(result: CanonicalPriceResult, articleId: string): number {
  if (result.unitPrice != null && result.unitPrice > 0 && result.certified) {
    return result.unitPrice;
  }
  throw new PriceUnavailableError(`Prix indisponible pour ${articleId}`);
}
