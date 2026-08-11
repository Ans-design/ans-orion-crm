/**
 * Variantes redondantes Grand Format à fusionner / archiver (pas de suppression métier).
 * Formats/paliers bâche, doublons vinyle/plexi, PLV synchronisés à tort comme GF.
 */

export const GF_BACHE_CANONICAL_ID = 'gf-bache';
export const GF_PLEXI_CANONICAL_ID = 'gf-plexi';
export const GF_VINYL_BLANC_CANONICAL_ID = 'gf-vinyl-blanc';
export const GF_VINYL_TRANSP_CANONICAL_ID = 'gf-vinyl-transp';
export const GF_PP_CANONICAL_ID = 'gf-pp';
export const GF_PVC_CANONICAL_ID = 'gf-pvc';
export const PLV_ROLLUP_CANONICAL_ID = 'plv-rollup';
export const PLV_XBANNER_CANONICAL_ID = 'plv-xbanner';

/** IDs connus issus de GrandFormatPricing / DirectSale à ne plus exposer comme cartes GF séparées */
export const REDUNDANT_GF_BACHE_IDS = [
  'GF001',
  'GF002',
  'GF003',
  'GF004',
  'GF005',
] as const;

export const REDUNDANT_GF_MATERIAL_IDS: Record<string, string> = {
  GF006: GF_VINYL_BLANC_CANONICAL_ID,
  GF007: GF_VINYL_TRANSP_CANONICAL_ID,
  GF010: GF_PLEXI_CANONICAL_ID,
  GF012: GF_PP_CANONICAL_ID,
  'gf-acrylic': GF_PLEXI_CANONICAL_ID,
};

/** PVC petit format (opaque/translucide A4) → hors Grand Format */
export const PVC_PETIT_FORMAT_IDS = ['GF008', 'GF009'] as const;

/** Produits PLV synchronisés à tort sous Grand Format OU doublons DirectSale des canoniques */
export const REDUNDANT_GF_PLV_IDS: Record<string, string> = {
  GF013: PLV_ROLLUP_CANONICAL_ID,
  GF014: PLV_XBANNER_CANONICAL_ID,
  AVD008: PLV_ROLLUP_CANONICAL_ID,
  AVD009: PLV_ROLLUP_CANONICAL_ID,
  AVD011: PLV_XBANNER_CANONICAL_ID,
};

/** SKUs DirectSale = variantes du configurateur PLV (pas de carte POS séparée) */
export const REDUNDANT_PLV_DIRECT_SALE_IDS = ['AVD008', 'AVD009', 'AVD011'] as const;

export function isRedundantPlvDirectSaleSku(
  name: string | null | undefined,
  articleId?: string | null,
): boolean {
  const id = (articleId ?? '').trim();
  if ((REDUNDANT_PLV_DIRECT_SALE_IDS as readonly string[]).includes(id)) return true;
  // Ne pas masquer les canoniques plv-rollup / plv-xbanner
  if (/^plv-(rollup|xbanner)$/i.test(id)) return false;
  const n = (name ?? '').trim();
  if (!n) return false;
  // Variantes dimensionnées type « Roll up standard 200x80 cm »
  if (/roll[\s-]?up.+\d+\s*[x×]\s*\d+/i.test(n)) return true;
  if (/x[\s-]?banner.+\d+\s*[x×]\s*\d+/i.test(n)) return true;
  return false;
}

const BACHE_VARIANT_RE =
  /^b[aâ]che\s+.+\s*(a0|a1|a2|a3|a4|a5|palier|180\s*cm|240|320)/i;
const BACHE_PALIER_RE = /b[aâ]che.+(palier|\d+\s*[-–]\s*\d+)/i;

export function isRedundantBacheVariant(name: string | null | undefined, articleId?: string | null): boolean {
  const id = (articleId ?? '').trim();
  if ((REDUNDANT_GF_BACHE_IDS as readonly string[]).includes(id)) return true;
  if (id === GF_BACHE_CANONICAL_ID) return false;
  const n = (name ?? '').trim();
  if (!n) return false;
  if (/^b[aâ]che$/i.test(n)) return false;
  return BACHE_VARIANT_RE.test(n) || BACHE_PALIER_RE.test(n);
}

export function isPlvFinishedProduct(name: string | null | undefined, articleId?: string | null): boolean {
  const id = (articleId ?? '').trim();
  if (REDUNDANT_GF_PLV_IDS[id]) return true;
  if (/^fin-/i.test(id) || /^plv-/i.test(id) && !REDUNDANT_GF_PLV_IDS[id]) {
    // fin-* = finitions ; plv-* canoniques déjà OK
    if (/^fin-/i.test(id)) return false;
  }
  const n = (name ?? '').trim();
  if (!n) return false;
  // Ne pas confondre « Couture Oriflammes » (finition) avec l’article Oriflamme
  if (/couture/i.test(n)) return false;
  return /roll[\s-]?up|x[\s-]?banner|^oriflamme\b|stop[\s-]?trottoir|porte[\s-]?affiche|porte[\s-]?flyer|pr[eé]sentoir|chevalet\s+plv/i.test(
    n,
  );
}

export function isPvcPetitFormatArticle(name: string | null | undefined, articleId?: string | null): boolean {
  const id = (articleId ?? '').trim();
  if ((PVC_PETIT_FORMAT_IDS as readonly string[]).includes(id)) return true;
  const n = (name ?? '').trim();
  if (!n) return false;
  if (/pvc\s+rigide|pvc\s+\d+\s*mm|plaque/i.test(n)) return false;
  return /pvc\s+(opaque|translucide|transparent)/i.test(n) && !/2400|plaque|3\s*mm|5\s*mm|10\s*mm|20\s*mm/i.test(n);
}

export function isPlexiAcrylicDuplicate(name: string | null | undefined, articleId?: string | null): boolean {
  const id = (articleId ?? '').trim();
  if (id === GF_PLEXI_CANONICAL_ID) return false;
  if (REDUNDANT_GF_MATERIAL_IDS[id] === GF_PLEXI_CANONICAL_ID) return true;
  const n = (name ?? '').trim();
  return /^plexiglass?$/i.test(n) || /^acrylic(\s*1\/3\/5mm)?$/i.test(n);
}

export function resolveGfCanonicalTarget(
  name: string | null | undefined,
  articleId?: string | null,
): string | null {
  const id = (articleId ?? '').trim();
  if (REDUNDANT_GF_MATERIAL_IDS[id]) return REDUNDANT_GF_MATERIAL_IDS[id];
  if (REDUNDANT_GF_PLV_IDS[id]) return REDUNDANT_GF_PLV_IDS[id];
  if (isRedundantBacheVariant(name, articleId)) return GF_BACHE_CANONICAL_ID;
  if (isPlexiAcrylicDuplicate(name, articleId)) return GF_PLEXI_CANONICAL_ID;
  if (/^vinyle\s+blanc/i.test(name ?? '')) return GF_VINYL_BLANC_CANONICAL_ID;
  if (/^vinyle\s+transparent/i.test(name ?? '')) return GF_VINYL_TRANSP_CANONICAL_ID;
  if (/ind[eé]chirable/i.test(name ?? '') && !id.startsWith('gf-pp')) return GF_PP_CANONICAL_ID;
  return null;
}

/**
 * Photo GF canonique (gf-photo) reste une ligne Admin / carte matière.
 * Seul l’ancien id Excel GF011 est un doublon à fusionner.
 */
export function isRedundantGrandFormatPosCard(
  name: string | null | undefined,
  articleId?: string | null,
): boolean {
  if (isRedundantBacheVariant(name, articleId)) return true;
  if (isPlexiAcrylicDuplicate(name, articleId)) return true;
  if (isRedundantPlvDirectSaleSku(name, articleId)) return true;
  if (isPvcPetitFormatArticle(name, articleId)) return true;
  const id = (articleId ?? '').trim();
  if (REDUNDANT_GF_MATERIAL_IDS[id]) return true;
  if (REDUNDANT_GF_PLV_IDS[id] && /^GF/i.test(id)) return true;
  // Ancien Excel GF011 uniquement — pas gf-photo / « Papier Photo GF »
  if (id === 'GF011') return true;
  return false;
}
