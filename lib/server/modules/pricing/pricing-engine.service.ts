import { calculatePrice } from '@/lib/pricing/calculate';
import { tryComputeDynamicPrice } from '@/lib/pricing/dynamic-engine';
import { isPrix2026LegacyEnabled } from '@/lib/pricing/prix-2026-legacy';
import { lookupPublishedBasePrintingPrice } from './base-printing-price.service';
import { resolvePublishedBaseMaterialPrice } from './base-material.service';

export type PricingEngineInput = {
  articleId: string;
  config: Record<string, unknown>;
  prixForce?: number;
  totalForce?: number;
  priceReason?: string;
};

/** Point d'entrée unifié — dynamic → base printing → legacy calculate. */
export async function computePricingEngine(input: PricingEngineInput) {
  const { articleId, config, ...options } = input;

  const dynamic = await tryComputeDynamicPrice(articleId, config, options);
  if (dynamic) {
    return { ...dynamic, engine: 'dynamic' as const };
  }

  const result = await calculatePrice(articleId, config, options);
  if (!result) return null;

  return {
    ...result,
    engine: 'legacy' as const,
    usesPrix2026Legacy: isPrix2026LegacyEnabled(),
  };
}

export async function resolveBasePriceHints(
  articleId: string,
  config: Record<string, unknown>,
) {
  const materialKey = String(config.matiere ?? config.material ?? config.paperType ?? '').trim();
  const grammage = String(config.grammage ?? config.paperWeight ?? '').trim() || null;

  const [basePrinting, baseMaterial] = await Promise.all([
    lookupPublishedBasePrintingPrice(articleId, config),
    materialKey ? resolvePublishedBaseMaterialPrice(materialKey, grammage) : Promise.resolve(null),
  ]);

  return { basePrinting, baseMaterial };
}
