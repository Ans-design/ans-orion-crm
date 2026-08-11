/**
 * Contrat PricingEngine — routeur par famille (Lot C5 V4).
 * Les moteurs dédiés restent dans lib/pricing/* ; calculatePrice reste l’adaptateur legacy.
 */
import type { PriceResult } from '@/lib/pricing/price-types';

export type PricingEngineFamily =
  | 'livres'
  | 'grand_format'
  | 'impression_sf'
  | 'flyer'
  | 'carterie'
  | 'packaging'
  | 'textile'
  | 'goodies'
  | 'event'
  | 'generic'
  | 'unknown';

export interface PricingEngineContext {
  articleId: string;
  config: Record<string, unknown>;
  qty: number;
}

export interface PricingEngine {
  readonly family: PricingEngineFamily;
  readonly label: string;
  /** true si ce moteur doit traiter l’article */
  matches(ctx: PricingEngineContext): boolean;
  /** Calcul unitaire — délégué à calculatePrice / moteurs dédiés */
  compute?(ctx: PricingEngineContext): Promise<PriceResult | null>;
}

/** Gel des nouvelles branches dans calculate.ts : enregistrer ici les familles supportées. */
export const PRICING_ENGINE_FAMILIES: PricingEngineFamily[] = [
  'livres',
  'grand_format',
  'impression_sf',
  'flyer',
  'carterie',
  'packaging',
  'textile',
  'goodies',
  'event',
  'generic',
];

export function assertKnownPricingFamily(family: string): asserts family is PricingEngineFamily {
  if (family === 'unknown') {
    throw new Error(`Famille tarifaire inconnue — enregistrer dans PRICING_ENGINE_FAMILIES`);
  }
  if (!(PRICING_ENGINE_FAMILIES as string[]).includes(family) && family !== 'unknown') {
    throw new Error(`Famille tarifaire non supportée: ${family}`);
  }
}

/** Résolution légère famille depuis articleId (préfixe catalogue). */
export function resolvePricingFamilyFromArticleId(articleId: string): PricingEngineFamily {
  const id = articleId.toLowerCase();
  if (id.startsWith('bk-') || id.includes('livre')) return 'livres';
  if (id.startsWith('gf-') || id.includes('bache') || id.includes('bâche')) return 'grand_format';
  if (id.startsWith('isf-') || id.includes('impression')) return 'impression_sf';
  if (id.includes('flyer')) return 'flyer';
  if (id.includes('carte') || id.includes('carterie')) return 'carterie';
  if (id.includes('pack') || id.includes('box')) return 'packaging';
  if (id.includes('textile') || id.includes('tshirt')) return 'textile';
  if (id.includes('goodie') || id.includes('stylo')) return 'goodies';
  if (id.includes('event') || id.includes('badge')) return 'event';
  if (articleId.trim()) return 'generic';
  return 'unknown';
}
