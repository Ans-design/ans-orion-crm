/**
 * Moteur de prix central V4 — point d'entrée unique pour Admin, POS, devis, panier.
 * Délègue à calculatePrice (legacy + dynamique publié) ; un seul chemin runtime.
 */
import { calculatePrice } from '@/lib/pricing/calculate';
import type { PriceResult } from '@/lib/pricing/price-types';
import type { PricingEngineMode, UnifiedPriceRequest, UnifiedPriceResult } from '@/lib/pricing/pricing-types';

export { calculatePrice, normalizeQty } from '@/lib/pricing/calculate';
export type { PriceResult } from '@/lib/pricing/price-types';

function resolveEngineMode(result: PriceResult, forced?: boolean): PricingEngineMode {
  if (forced) return 'forced';
  const snap = result.snapshot as Record<string, unknown> | undefined;
  const src = String(snap?.priceSource ?? '');
  if (snap?.dynamicEngine || src.startsWith('dynamic')) return 'dynamic';
  if (result.pricingMode === 'force_pu' || result.pricingMode === 'force_total') return 'forced';
  return src ? 'legacy' : 'none';
}

export async function computeUnifiedPrice(req: UnifiedPriceRequest): Promise<UnifiedPriceResult | null> {
  const qty = Math.max(1, Math.floor(Number(req.config?.qty ?? req.qty ?? 1) || 1));
  const config = { ...req.config, qty };

  const result = await calculatePrice(req.articleId, config, {
    prixForce: req.prixForce,
    totalForce: req.totalForce,
    priceReason: req.priceReason,
    skipDynamic: req.skipDynamic,
  });

  if (!result) return null;

  const forced = Boolean(req.prixForce ?? req.totalForce);
  const mode = resolveEngineMode(result, forced);
  const snap = result.snapshot as Record<string, unknown>;

  return {
    prixUnitaire: result.prixUnitaire,
    totalHT: result.totalHT,
    totalTTC: result.totalTTC,
    pricingMode: mode,
    engine: String(snap?.priceSource ?? mode),
    formulaApplied: result.formulaApplied,
    pipeline: snap,
  };
}

/** Alias explicite pour simulateur admin (= POS) */
export const simulatePrice = computeUnifiedPrice;
