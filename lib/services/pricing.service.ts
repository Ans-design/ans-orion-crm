import { getDynamicPricingStats } from '@/lib/pricing/publish-dynamic-pricing';
import { calculatePrice } from '@/lib/pricing/calculate';

/** Statistiques pricing backoffice */
export async function getPricingOverviewStats() {
  return getDynamicPricingStats();
}

/** Preview prix POS (moteur unifié) */
export async function previewPosPrice(input: {
  articleId: string;
  qty: number;
  config?: Record<string, unknown>;
}) {
  const config = { qty: input.qty, ...(input.config ?? {}) };
  return calculatePrice(input.articleId, config);
}
