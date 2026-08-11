import type { MockupKind } from '@/lib/data/article-mockup-registry';

/** Couleurs « vierge catalogue B2B » — blanc / naturel, pas la couleur de catégorie UI */
const BLANK_PRODUCT_COLORS: Partial<Record<MockupKind, string>> = {
  cap: '#f2f2ee',
  bob: '#f2f2ee',
  tshirt: '#fafafa',
  polo: '#fafafa',
  sweat: '#ececec',
  gilet: '#f0f0ec',
  maillot: '#ffffff',
  combinaison: '#e8e8e4',
  survetement: '#ececec',
  lambahoany: '#f5f0e8',
  tote: '#f5f5f0',
  bag: '#f5f5f0',
  mug: '#ffffff',
  cup: '#ffffff',
  bottle: '#c0c8d0',
  pen: '#ffffff',
  box: '#ffffff',
  pouch: '#d4b896',
  paperbag: '#d4b896',
  card: '#ffffff',
  flyer: '#ffffff',
  poster: '#ffffff',
  invitation: '#ffffff',
  letterhead: '#ffffff',
  menu: '#ffffff',
  notebook: '#ffffff',
  book: '#ffffff',
  sticker: '#ffffff',
  envelope: '#ffffff',
  badge: '#ffffff',
  ticket: '#ffffff',
  playing_cards: '#ffffff',
  photo_print: '#ffffff',
  photobook: '#ffffff',
  calendar: '#ffffff',
  canvas: '#ffffff',
  mesh_banner: '#f8f8f8',
  vinyl_sheet: '#ffffff',
  rigid_panel: '#ffffff',
  rollup: '#ffffff',
  xbanner: '#ffffff',
  chevalet: '#ffffff',
  display: '#ffffff',
  totem: '#ffffff',
  photocall: '#ffffff',
  flag: '#ffffff',
  lanyard: '#ffffff',
  bracelet: '#ffffff',
  keychain: '#c0c8d0',
  pin: '#c0c8d0',
  usb: '#c0c8d0',
  lighter: '#c0c8d0',
  umbrella: '#ffffff',
  mousepad: '#2a2a2a',
  phone_case: '#333333',
  stamp: '#ffffff',
  depliant: '#ffffff',
  flat: '#ffffff',
};

const NEUTRAL_CATEGORIES = new Set([
  'textile',
  'goodies',
  'packaging',
  'carterie',
  'flyers',
  'document',
  'impression',
  'livres',
  'calendrier',
  'notes',
  'evenementiel',
  'photo',
  'finitions',
]);

function parseConfigColor(config?: Record<string, unknown>): string | null {
  if (!config) return null;
  for (const key of ['couleur', 'color', 'couleur_support', 'couleur_tissu']) {
    const v = config[key];
    if (typeof v === 'string' && v.trim() && !v.toLowerCase().includes('blanc')) {
      return v.trim();
    }
  }
  return null;
}

/** Couleur produit pour l’aperçu — blanc vierge par défaut, jamais la couleur UI catégorie */
export function resolvePreviewProductColor(
  categoryId: string,
  previewType: MockupKind,
  categoryUiColor: string,
  config?: Record<string, unknown>,
): string {
  const fromConfig = parseConfigColor(config);
  if (fromConfig) return fromConfig;

  if (BLANK_PRODUCT_COLORS[previewType]) {
    return BLANK_PRODUCT_COLORS[previewType]!;
  }

  if (NEUTRAL_CATEGORIES.has(categoryId)) {
    return '#fafafa';
  }

  return categoryUiColor;
}
