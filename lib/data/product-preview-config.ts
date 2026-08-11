/**
 * Configuration aperçus produits POS — style catalogue e-commerce B2B.
 * Chaque article possède un previewType reconnaissable + fallback catégorie.
 */
import { CATALOGUE } from '@/lib/data/catalogue';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import type { MockupKind } from '@/lib/data/article-mockup-registry';
import { ARTICLE_MOCKUP_REGISTRY } from '@/lib/data/article-mockup-registry';
import { resolveMockupKind } from '@/lib/data/mockup-resolver';

export type PreviewVariantRule = {
  /** Clé config POS (face, format, type, coins, …) */
  configKey: string;
  /** Valeurs déclenchant la variante (match partiel insensible à la casse) */
  match: string[];
  landscape?: boolean;
  roundedCorners?: boolean;
  showRectoVersoBadge?: boolean;
  /** Suffixe asset optionnel ex. landscape */
  assetSuffix?: string;
};

export type ProductPreviewConfig = {
  articleId: string;
  categoryId: string;
  previewType: MockupKind;
  previewLabel: string;
  /** Chemin public optionnel /assets/products/... — SVG fallback catégorie par défaut */
  assetPath?: string;
  categoryFallbackAsset?: string;
  isActive: boolean;
  variantRules?: PreviewVariantRule[];
};

/** Assets fallback par catégorie — SVG studio haute fidélité */
export const CATEGORY_PREVIEW_FALLBACKS: Record<string, string> = {
  packaging: '/assets/products/fallbacks/packaging-box.svg',
  calendrier: '/assets/products/fallbacks/calendar-desk.svg',
  notes: '/assets/products/fallbacks/notebook-spiral.svg',
  plv: '/assets/products/fallbacks/rollup-banner.svg',
  livres: '/assets/products/fallbacks/book-softcover.svg',
  carterie: '/assets/products/fallbacks/business-card-stack.svg',
  flyers: '/assets/products/fallbacks/flyer-stack.svg',
  finitions: '/assets/products/fallbacks/finish-sheet.svg',
  grand_format: '/assets/products/fallbacks/mesh-banner-grommets.svg',
  textile: '/assets/products/fallbacks/tshirt-front.svg',
  goodies: '/assets/products/fallbacks/mug-white.svg',
  evenementiel: '/assets/products/fallbacks/poster-event.svg',
  photo: '/assets/products/fallbacks/photo-print.svg',
  document: '/assets/products/fallbacks/letterhead-stack.svg',
  impression: '/assets/products/fallbacks/paper-stack.svg',
  conception: '/assets/products/fallbacks/design-service.svg',
};

/** Libellés catalogue par previewType */
export const PREVIEW_TYPE_LABELS: Partial<Record<MockupKind, string>> = {
  mug: 'Mug céramique',
  bottle: 'Bouteille / gourde',
  tshirt: 'T-shirt',
  polo: 'Polo',
  sweat: 'Sweat',
  cap: 'Casquette',
  bob: 'Bob',
  tote: 'Tote bag',
  card: 'Carte de visite',
  playing_cards: 'Jeu de cartes',
  flyer: 'Flyer / dépliant',
  poster: 'Affiche / poster',
  depliant: 'Dépliant plié',
  invitation: 'Carte invitation',
  book: 'Livret / brochure',
  menu: 'Menu restaurant',
  notebook: 'Bloc-notes',
  rollup: 'Roll-up',
  xbanner: 'X-Banner',
  chevalet: 'Chevalet PLV',
  flag: 'Oriflamme / fanion',
  mesh_banner: 'Bâche grand format',
  vinyl_sheet: 'Vinyle adhésif',
  rigid_panel: 'Panneau rigide PVC/Plexi',
  canvas: 'Toile châssis',
  sticker: 'Autocollant / sticker',
  box: 'Boîte packaging',
  pouch: 'Doypack',
  paperbag: 'Sac papier',
  cup: 'Gobelet carton',
  envelope: 'Enveloppe',
  badge: 'Badge événementiel',
  bracelet: 'Bracelet',
  ticket: 'Billet / ticket',
  lanyard: 'Cordon / lanyard',
  photocall: 'Photocall / mur photo',
  display: 'Présentoir PLV',
  totem: 'Totem sol',
  calendar: 'Calendrier',
  photobook: 'Album photo',
  photo_print: 'Tirage photo',
  letterhead: 'Papier en-tête',
  stamp: 'Tampon',
  pen: 'Stylo',
  keychain: 'Porte-clés',
  pin: "Pin's / badge",
  usb: 'Clé USB',
  umbrella: 'Parapluie',
  lighter: 'Briquet',
  mousepad: 'Tapis de souris',
  phone_case: 'Housse téléphone',
  gilet: 'Gilet',
  maillot: 'Maillot',
  combinaison: 'Combinaison',
  survetement: 'Survêtement',
  lambahoany: 'Lambahoany',
  conception: 'Conception graphique',
};

const COMMON_VARIANT_RULES: PreviewVariantRule[] = [
  {
    configKey: 'face',
    match: ['recto-verso', 'recto verso', 'r/v'],
    showRectoVersoBadge: true,
  },
  {
    configKey: 'coins',
    match: ['coins arrondis', 'r3', 'r5', 'r8', 'arrondi'],
    roundedCorners: true,
  },
  {
    configKey: 'format',
    match: ['paysage', 'landscape', 'horizontal'],
    landscape: true,
  },
  {
    configKey: 'orientation',
    match: ['paysage', 'landscape', 'horizontal'],
    landscape: true,
  },
];

function articleAssetPath(_articleId: string, _previewType: MockupKind): string | undefined {
  return undefined;
}

/** Registre généré depuis le catalogue + mockup registry */
function buildProductPreviewRegistry(): Record<string, ProductPreviewConfig> {
  const out: Record<string, ProductPreviewConfig> = {};

  for (const art of POS_CATALOGUE) {
    const mock = ARTICLE_MOCKUP_REGISTRY[art.id];
    const previewType = mock?.kind && mock.kind !== 'flat'
      ? mock.kind
      : resolveMockupKind(art.id, art.category);

    out[art.id] = {
      articleId: art.id,
      categoryId: art.category,
      previewType,
      previewLabel: PREVIEW_TYPE_LABELS[previewType] ?? art.name,
      categoryFallbackAsset: CATEGORY_PREVIEW_FALLBACKS[art.category],
      assetPath: articleAssetPath(art.id, previewType),
      isActive: true,
      variantRules: [...COMMON_VARIANT_RULES],
    };
  }

  return out;
}

export const PRODUCT_PREVIEW_REGISTRY: Record<string, ProductPreviewConfig> =
  buildProductPreviewRegistry();

export function getProductPreviewConfig(articleId: string): ProductPreviewConfig | null {
  return PRODUCT_PREVIEW_REGISTRY[articleId] ?? null;
}

export const PRODUCT_PREVIEW_COUNT = Object.keys(PRODUCT_PREVIEW_REGISTRY).length;
