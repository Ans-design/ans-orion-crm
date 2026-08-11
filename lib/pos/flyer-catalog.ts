/**
 * Flyers — article catalogue unique, formats en dimension configurable.
 */

export const FLYER_CANONICAL_ID = 'fly-std';

/** Formats flyer (seule dimension différenciante). */
export const FLYER_FORMAT_OPTIONS = [
  'A6 — 105×148 mm',
  'DL — 99×210 mm',
  'A5 — 148×210 mm',
  'B5 — 176×250 mm',
  'A4 — 210×297 mm',
  'A3 — 297×420 mm',
  'Carré — 90×90 mm',
  'Format personnalisé',
] as const;

export type FlyerFormat = (typeof FLYER_FORMAT_OPTIONS)[number];

/** IDs historiques (URLs / panier / prix) → article canonique. */
export const FLYER_LEGACY_IDS = [
  'fly-a6',
  'fly-dl',
  'fly-a5',
  'fly-b5',
  'fly-a4',
  'fly-a3',
  'fly-90',
] as const;

export type FlyerLegacyId = (typeof FLYER_LEGACY_IDS)[number];

export const FLYER_LEGACY_PREFILL: Record<FlyerLegacyId, { format: string }> = {
  'fly-a6': { format: 'A6 — 105×148 mm' },
  'fly-dl': { format: 'DL — 99×210 mm' },
  'fly-a5': { format: 'A5 — 148×210 mm' },
  'fly-b5': { format: 'B5 — 176×250 mm' },
  'fly-a4': { format: 'A4 — 210×297 mm' },
  'fly-a3': { format: 'A3 — 297×420 mm' },
  'fly-90': { format: 'Carré — 90×90 mm' },
};

/** Quantité minimum par format (ex-anciens articles). */
export const FLYER_MIN_QTY_BY_FORMAT: Record<string, number> = {
  'A6 — 105×148 mm': 20,
  'DL — 99×210 mm': 15,
  'DL — 100×210 mm': 15, // alias legacy
  'A5 — 148×210 mm': 10,
  'B5 — 176×250 mm': 5,
  'A4 — 210×297 mm': 20,
  'A3 — 297×420 mm': 20,
  'Carré — 90×90 mm': 30,
  'Format personnalisé': 25,
};

export function isFlyerLegacyId(articleId: string): articleId is FlyerLegacyId {
  return (FLYER_LEGACY_IDS as readonly string[]).includes(articleId);
}

export function isFlyerArticleId(articleId: string, category?: string): boolean {
  if (articleId === FLYER_CANONICAL_ID || isFlyerLegacyId(articleId)) return true;
  return articleId.startsWith('fly-') || category === 'flyers';
}

export function resolveFlyerCanonicalId(articleId: string): string {
  if (isFlyerLegacyId(articleId)) return FLYER_CANONICAL_ID;
  if (/^AVD0(16|17|18)$/i.test(articleId)) return FLYER_CANONICAL_ID;
  return articleId;
}

export function flyerLegacyPrefill(articleId: string): { format: string } | null {
  if (!isFlyerLegacyId(articleId)) return null;
  return FLYER_LEGACY_PREFILL[articleId];
}

export function getFlyerMinQty(format: string | undefined): number {
  if (!format) return 5;
  return FLYER_MIN_QTY_BY_FORMAT[format] ?? 25;
}

/** Silhouette mockup (mm) dérivée du format configurateur. */
export const FLYER_SILHOUETTE_BY_FORMAT: Record<string, { widthMm: number; heightMm: number; label: string }> = {
  'A6 — 105×148 mm': { widthMm: 105, heightMm: 148, label: 'A6 — 105×148 mm' },
  'DL — 99×210 mm': { widthMm: 99, heightMm: 210, label: 'DL — 99×210 mm' },
  'DL — 100×210 mm': { widthMm: 99, heightMm: 210, label: 'DL — 99×210 mm' },
  'A5 — 148×210 mm': { widthMm: 148, heightMm: 210, label: 'A5 — 148×210 mm' },
  'B5 — 176×250 mm': { widthMm: 176, heightMm: 250, label: 'B5 — 176×250 mm' },
  'A4 — 210×297 mm': { widthMm: 210, heightMm: 297, label: 'A4 — 210×297 mm' },
  'A3 — 297×420 mm': { widthMm: 297, heightMm: 420, label: 'A3 — 297×420 mm' },
  'Carré — 90×90 mm': { widthMm: 90, heightMm: 90, label: 'Carré — 90×90 mm' },
};
