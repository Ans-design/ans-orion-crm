/**
 * Mapping Catalogue Articles 2026 (280 ART-xxx) → parents POS (~95).
 * Une ligne ART = variante de prix (format / matière / taille…), jamais une carte catalogue.
 */

import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { resolvePersonalizedCanonical } from '@/lib/pos/personalized-article-redundant';
import { REDUNDANT_GF_PLV_IDS } from '@/lib/pos/grand-format-redundant';

export type Article2026CanonicalInput = {
  ref: string;
  family: string;
  article: string;
  variant: string;
  format?: string;
  unitPrice?: number;
};

export const POS_PARENT_IDS = new Set(POS_CATALOGUE.map((a) => a.id));

/** Prefixe convention archive / lookup prix */
export function artVariantArchiveLabel(canonicalId: string, displayName: string): string {
  const clean = displayName.replace(/^\[prix→[^\]]+\]\s*/i, '').replace(/^\[archivé→[^\]]+\]\s*/i, '');
  return `[prix→${canonicalId}] ${clean}`.slice(0, 200);
}

/**
 * Résout le parent POS pour une ligne Articles 2026.
 * Couverture cible : 100 % des 280 ART.
 */
export function resolveArticle2026CanonicalPosId(row: Article2026CanonicalInput): string {
  const article = String(row.article ?? '').trim();
  const variant = String(row.variant ?? '').trim();
  const name = `${article} ${variant}`.trim();
  const family = String(row.family ?? '').trim();
  const idHint = String(row.ref ?? '').trim();

  // --- PLV / signalétique ---
  if (/roll[\s-]?up/i.test(name)) return 'plv-rollup';
  if (/x[\s-]?banner/i.test(name)) return 'plv-xbanner';
  if (/\boriflamme\b/i.test(name)) return 'plv-oriflamme';
  if (/plaque\s+pvc/i.test(name)) return 'gf-pvc';
  if (/plaque\s+plexiglass|plexiglas/i.test(name)) return 'gf-plexi';

  // --- Carterie / flyers ---
  if (/carte\s+de\s+visite/i.test(name)) return 'cv-std';
  if (/carte\s+fid[eé]lit/i.test(name)) return 'cv-fidelite';
  if (/^flyer\b|flyer\s/i.test(article) || /^flyer\b/i.test(name)) return 'fly-std';

  // --- Photo ---
  if (/tirage\s+photo/i.test(name)) return 'ph-tirage';
  if (/photobook|album\s+photo/i.test(name)) return 'ph-photobook';
  if (/cadre\s+photo/i.test(name)) return 'ph-cadre';

  // --- Calendriers ---
  if (/mini[\s-]?calendrier|marque[\s-]?page/i.test(name)) return 'cal-marquepage';
  if (/calendrier\s+plateau/i.test(name)) return 'cal-plateau';
  if (/calendrier\s+mural/i.test(name)) return 'cal-mural';
  if (/chevalet\s+de\s+table/i.test(name)) return 'cal-chevalet-table';
  if (/calendrier\s+chevalet|chevalet\s+de\s+bureau/i.test(name)) return 'cal-chevalet';

  // --- Notes / docs ---
  if (/bloc[\s-]?note/i.test(name)) return 'bn-bloc-note';
  if (/carnet\s+(facture|de\s+re[cç]us|autocopiant)|autocopiant/i.test(name)) return 'doc-carnet';
  if (/papier\s+en[\s-]?t[eê]te|en[\s-]?t[eê]te/i.test(name)) return 'imp-impression';

  // --- Packaging ---
  if (/hangtag/i.test(name)) return 'pkg-hangtag';
  if (/sac\s+papier/i.test(name)) return 'pkg-sac';
  if (/gobelet/i.test(name)) return 'pkg-gobelet';
  if (/doypack/i.test(name)) return 'pkg-doypack';
  if (/bo[iî]te/i.test(name)) return 'pkg-boite';
  if (/top\s+case|milena/i.test(name)) return 'pkg-boite';

  // --- Événementiel ---
  if (/badge\s+[eé]v[eé]nement|porte[\s-]?badge/i.test(name)) return 'evt-badge';
  if (/bracelet/i.test(name)) return 'evt-bracelet';
  if (/photocall|backdrop/i.test(name)) return 'evt-photocall';
  if (/photobooth/i.test(name)) return 'evt-photobooth';

  // --- Textile / goodies ---
  if (/^t[\s-]?shirts?\b|t[\s-]?shirt\s+\d/i.test(article) || /\bt[\s-]?shirt\b/i.test(article)) {
    return 'tx-tshirt';
  }
  if (/^polos?\b|polo\s+\d/i.test(article) || /\bpolo\b/i.test(article)) return 'tx-polo';
  if (/\bsweat\b/i.test(article)) return 'tx-sweat';
  if (/\bcasquette\b/i.test(article)) return 'tx-casquette';
  if (/\bbob\b/i.test(article)) return 'tx-bob';
  if (/\btrousse\b/i.test(article)) return 'tx-trousse';
  if (/tote\s*bag|totebag/i.test(article)) return 'tx-totebag';
  if (/\bmugs?\b/i.test(article)) return 'gd-mug';
  if (/\bgourdes?\b/i.test(article)) return 'gd-gourde';
  if (/\bstylos?\b/i.test(article)) return 'gd-stylo';
  if (/\bpins?\b|pin'?s/i.test(article)) return 'gd-pins';

  const personalized = resolvePersonalizedCanonical(name, idHint);
  if (personalized) return personalized.canonicalId;

  if (REDUNDANT_GF_PLV_IDS[idHint]) return REDUNDANT_GF_PLV_IDS[idHint];

  const fam = family
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (fam.includes('flyer')) return 'fly-std';
  if (fam.includes('carte')) return 'cv-std';
  if (fam.includes('textile')) return 'tx-tshirt';
  if (fam.includes('goodies')) return 'gd-stylo';
  if (fam.includes('photo')) return 'ph-tirage';
  if (fam.includes('calendrier')) return 'cal-chevalet';
  if (fam.includes('document')) return 'doc-carnet';
  if (fam.includes('plv')) return 'plv-rollup';

  return 'fin-autres';
}

export function isPosParentArticleId(id: string | null | undefined): boolean {
  return POS_PARENT_IDS.has(String(id ?? '').trim());
}

/**
 * Carte « Prix articles / Catalogue POS » : parent uniquement.
 * ART-xxx et lignes `[prix→…]` = variantes prix (masquées).
 */
export function isPosCatalogueParentCard(opts: {
  id?: string | null;
  excelId?: string | null;
  reference?: string | null;
  name?: string | null;
  visiblePOS?: boolean | null;
  status?: string | null;
}): boolean {
  if (opts.status === 'archived') return false;
  if (opts.visiblePOS === false) return false;

  const excelId = String(opts.excelId ?? '').trim();
  const reference = String(opts.reference ?? '').trim();
  const name = String(opts.name ?? '').trim();
  const id = String(opts.id ?? '').trim();

  if (/^ART-/i.test(excelId) || /^ART-/i.test(id)) return false;
  if (/^\[prix→/i.test(name) || /^\[archiv/i.test(name)) return false;

  if (isPosParentArticleId(reference) || isPosParentArticleId(excelId) || isPosParentArticleId(id)) {
    return true;
  }

  return false;
}

/** Agrège un prix « à partir de » (min positif) par parent. */
export function aggregateMinPriceByCanonical(
  rows: Article2026CanonicalInput[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const can = resolveArticle2026CanonicalPosId(row);
    const price = Number(row.unitPrice);
    if (!Number.isFinite(price) || price <= 0) continue;
    const prev = map.get(can);
    if (prev == null || price < prev) map.set(can, Math.round(price));
  }
  return map;
}
