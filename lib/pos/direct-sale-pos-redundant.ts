/**
 * SKUs DirectSale dimensionnés / variantes → articles catalogue canoniques.
 * Zéro suppression : archive carte POS + deep-link configurateur.
 */
import {
  FLYER_CANONICAL_ID,
  resolveFlyerCanonicalId,
} from '@/lib/pos/flyer-catalog';

export const CV_STD_CANONICAL_ID = 'cv-std';
export const CV_FIDELITE_CANONICAL_ID = 'cv-fidelite';

/** IDs DirectSale → article POS canonique */
export const DIRECT_SALE_POS_CANONICAL: Record<string, string> = {
  AVD012: CV_FIDELITE_CANONICAL_ID,
  AVD013: CV_STD_CANONICAL_ID,
  AVD014: CV_STD_CANONICAL_ID,
  AVD016: FLYER_CANONICAL_ID,
  AVD017: FLYER_CANONICAL_ID,
  AVD018: FLYER_CANONICAL_ID,
};

/** Prefill configurateur depuis URL / deep-link legacy */
export const DIRECT_SALE_POS_PREFILL: Record<string, Record<string, string>> = {
  AVD012: {},
  AVD013: { face: 'Recto' },
  AVD014: { face: 'Recto-verso' },
  AVD016: { format: 'A4 — 210×297 mm', face: 'Recto-verso' },
  AVD017: { format: 'Carré — 90×90 mm', face: 'Recto' },
  AVD018: { format: 'Carré — 90×90 mm', face: 'Recto-verso' },
};

export const REDUNDANT_DIRECT_SALE_POS_IDS = Object.keys(DIRECT_SALE_POS_CANONICAL);

export function isRedundantDirectSalePosSku(
  name: string | null | undefined,
  articleId?: string | null,
): boolean {
  const id = (articleId ?? '').trim();
  if (DIRECT_SALE_POS_CANONICAL[id]) return true;
  // Ne pas masquer les canoniques
  if (
    id === CV_STD_CANONICAL_ID
    || id === CV_FIDELITE_CANONICAL_ID
    || id === FLYER_CANONICAL_ID
    || resolveFlyerCanonicalId(id) === FLYER_CANONICAL_ID && id === FLYER_CANONICAL_ID
  ) {
    return false;
  }
  const n = (name ?? '').trim();
  if (!n) return false;
  // Variantes dimensionnées flyer hors canonique
  if (/^flyers?\s+\d+/i.test(n) || /^flyers?\s+a\d/i.test(n)) return true;
  if (/carte\s+de\s+visite\s+recto/i.test(n)) return true;
  if (/carte\s+de\s+fid[eé]lit[eé]\s+standard/i.test(n)) return true;
  return false;
}

export function resolveDirectSalePosCanonical(
  name: string | null | undefined,
  articleId?: string | null,
): string | null {
  const id = (articleId ?? '').trim();
  if (DIRECT_SALE_POS_CANONICAL[id]) return DIRECT_SALE_POS_CANONICAL[id];
  const n = (name ?? '').trim();
  if (/carte\s+de\s+fid[eé]lit/i.test(n)) return CV_FIDELITE_CANONICAL_ID;
  if (/carte\s+de\s+visite/i.test(n) && /recto/i.test(n)) return CV_STD_CANONICAL_ID;
  if (/^flyers?\s+/i.test(n) && !/^flyer$/i.test(n)) return FLYER_CANONICAL_ID;
  return null;
}

export function directSalePosPrefill(articleId: string): Record<string, string> | null {
  return DIRECT_SALE_POS_PREFILL[articleId] ?? null;
}
