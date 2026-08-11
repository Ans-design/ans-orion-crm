import { isCalendarArticleId } from '@/lib/calendar/calendar-material-policy';
import { BACHE_CANONICAL_ID } from '@/lib/pos/bache-catalog';
import { articleHasDedicatedPricingEngine } from '@/lib/pos/pos-price-policy';
import { isGoodiesArticleId } from '@/lib/pricing/goodies-pricing';

/**
 * Articles dont le prix affiché au POS doit venir du moteur serveur (`calculate.ts`).
 * Aligné sur les moteurs dédiés + goodies (dynamique Admin) — zéro exception client seule.
 */
export function articleUsesUnifiedServerPricing(articleId: string, category?: string): boolean {
  if (!articleId) return false;
  if (articleId === BACHE_CANONICAL_ID) return true;
  if (isCalendarArticleId(articleId)) return true;
  if (isGoodiesArticleId(articleId)) return true;
  return articleHasDedicatedPricingEngine(articleId, category);
}
