import {
  calculateLivresMaterialRecap,
  type LivresMaterialRecap,
} from '@/lib/pricing/livres-material-recap';
import { isLivresPricingArticle } from '@/lib/pricing/livres-pricing';

export type { LivresMaterialRecap };

export function resolveLivresMaterialRecap(
  articleId: string,
  config: Record<string, unknown>,
): LivresMaterialRecap | null {
  if (!isLivresPricingArticle(articleId)) return null;
  return calculateLivresMaterialRecap(articleId, config);
}
