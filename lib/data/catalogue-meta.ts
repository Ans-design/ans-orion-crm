import { CATALOGUE, type CatalogueItem } from '@/lib/data/catalogue';
import { resolveCatalogCanonicalId } from '@/lib/pos/catalog-resolver';
import { PH_TIRAGE_LEGACY_IDS } from '@/lib/pricing/tirage-photo-pricing';
import {
  REDUNDANT_TIRAGE_PHOTO_IDS,
  isRedundantTiragePhotoArticle,
} from '@/lib/pos/tirage-photo-redundant';
import {
  REDUNDANT_GF_BACHE_IDS,
  REDUNDANT_GF_MATERIAL_IDS,
  isRedundantGrandFormatPosCard,
} from '@/lib/pos/grand-format-redundant';
import {
  REDUNDANT_VARIANT_POS_IDS,
  isRedundantFinitionVariantCard,
} from '@/lib/pos/finition-variant-redundant';

/** Articles masqués du catalogue POS (legacy, doublons, utilitaires tarifs). */
export const POS_HIDDEN_ARTICLE_IDS = new Set([
  'imp-conception',
  'cal-sousmain',
  'gf-acrylic', // fusionné → gf-plexi (Acrylic / Plexiglas)
  'e2e-bo-pos', // fixture E2E — jamais carte POS commerciale
  '__volume_global__', // paliers volume globaux — pas une carte vendable
  ...PH_TIRAGE_LEGACY_IDS,
  ...REDUNDANT_TIRAGE_PHOTO_IDS,
  ...REDUNDANT_GF_BACHE_IDS,
  ...Object.keys(REDUNDANT_GF_MATERIAL_IDS),
  'GF013',
  'GF014',
  'AVD008',
  'AVD009',
  'AVD011',
  'AVD012',
  'AVD013',
  'AVD014',
  'AVD016',
  'AVD017',
  'AVD018',
  // Doublons « personnalisé » → articles catalogue (tx-* / gd-*)
  'AVD019',
  'AVD020',
  'AVD021',
  'AVD022',
  'AVD023',
  'AVD024',
  'AVD025',
  'AVD026',
  'AVD027',
  'AVD028',
  'AVD029',
  'AVD002',
  // PVC petit / Photo GF / variantes finitions (diamètre, format…)
  ...REDUNDANT_VARIANT_POS_IDS,
]);

/** Filtre défensif : variantes « Tirage photo A4… » jamais en carte POS. */
export function isPosHiddenTirageVariant(articleId: string, label?: string | null): boolean {
  return isRedundantTiragePhotoArticle(label, articleId);
}

/** Filtre défensif : formats/paliers bâche, doublons plexi/vinyle, PLV GF*. */
export function isPosHiddenGrandFormatVariant(articleId: string, label?: string | null): boolean {
  if (POS_HIDDEN_ARTICLE_IDS.has(articleId)) return true;
  return isRedundantGrandFormatPosCard(label, articleId);
}

/** Filtre défensif : spirales/collage/plastif par format, PVC, Photo GF. */
export function isPosHiddenFinitionVariant(articleId: string, label?: string | null): boolean {
  if (POS_HIDDEN_ARTICLE_IDS.has(articleId)) return true;
  return isRedundantFinitionVariantCard(label, articleId);
}

export const POS_CATALOGUE = CATALOGUE.filter((a) => !POS_HIDDEN_ARTICLE_IDS.has(a.id));

export function posCatalogueCount(): number {
  return POS_CATALOGUE.length;
}

/** Recherche catalogue avec résolution des IDs legacy (bloc-note, PLV…). */
export function findCatalogueItem(articleId: string): CatalogueItem | undefined {
  const canonicalId = resolveCatalogCanonicalId(articleId);
  return CATALOGUE.find((a) => a.id === canonicalId);
}
