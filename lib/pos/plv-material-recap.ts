import {
  calculatePlvMaterialRecap,
  type PlvMaterialRecap,
} from '@/lib/pricing/plv-material-recap';
import { isPlvPricingArticle } from '@/lib/pricing/plv-pricing';

export type { PlvMaterialRecap };

export function resolvePlvMaterialRecap(
  articleId: string,
  config: Record<string, unknown>,
): PlvMaterialRecap | null {
  if (!isPlvPricingArticle(articleId)) return null;
  return calculatePlvMaterialRecap(articleId, config);
}
