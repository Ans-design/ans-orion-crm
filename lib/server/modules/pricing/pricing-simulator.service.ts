import { resolvePrice } from '@/lib/pricing/ans-price-store';
import { loadPublishedDynamicContext } from '@/lib/pricing/dynamic-pricing-context';
import { normalizePaperInConfig, validatePaperConfigStrict } from '@/lib/data/paper-material';

export type PricingSimulateInput = {
  articleId: string;
  config?: Record<string, unknown>;
  qty?: number;
  prixForce?: number;
  totalForce?: number;
  priceReason?: string;
};

/** Simulateur prix — moteur réel (legacy + dynamique publié). */
export async function simulateBackofficePricing(input: PricingSimulateInput) {
  const { articleId, config = {}, qty, prixForce, totalForce, priceReason } = input;

  const { config: normalized } = normalizePaperInConfig(config);
  const paperCheck = validatePaperConfigStrict(normalized);
  if (!paperCheck.ok) {
    return { ok: false as const, code: 'VALIDATION', message: paperCheck.error ?? 'Configuration invalide' };
  }

  const mergedConfig = { ...normalized, qty: qty ?? normalized.qty ?? normalized.quantite ?? 1 };
  const result = await resolvePrice(articleId, mergedConfig, { prixForce, totalForce, priceReason });

  if (!result) {
    return { ok: false as const, code: 'NOT_FOUND', message: 'Article introuvable' };
  }

  const dynamicCtx = await loadPublishedDynamicContext(articleId);

  return {
    ok: true as const,
    result,
    dynamicProfile: dynamicCtx?.profile ?? null,
    dynamicFormula: dynamicCtx?.formula ?? null,
    engine: (result.snapshot as Record<string, unknown>)?.dynamicEngine ? 'dynamic' : 'legacy',
  };
}
