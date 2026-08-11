import type {
  DimensionMode,
  FallbackComponentKey,
  ObjectMockupKey,
  OrientationMode,
  PreviewModeKind,
  ProductPreviewFamily,
} from '@/lib/pos-preview/product-preview.types';
import { MUG_PRODUCT_IDS } from '@/lib/pos-preview/product-preview.types';

const RIGID_GF = new Set([
  'gf-pvc',
  'gf-plexi',
  'gf-acrylic',
  'gf-pp',
  'gf-toile',
  'ph-cadre',
]);

const VERTICAL_PLV = new Set([
  'plv-rollup',
  'plv-xbanner',
  'plv-oriflamme',
  'plv-presentoir-sol',
  'evt-fanion',
  'evt-photocall',
  'evt-comptoir',
]);

const BOOKLET_IDS = new Set([
  'bk-livres',
  'ph-photobook',
  'plv-porte-flyers',
  'cal-plateau',
  'cal-mural',
  'bn-bloc-note',
]);

const PAPER_IDS = new Set([
  'cv-std',
  'cv-fidelite',
  'cv-jeux',
  'fly-std',
  'evt-affiche',
  'evt-billet',
  'evt-carte-voeux',
  'evt-cheque',
  'evt-enveloppe',
  'doc-carnet',
  'imp-impression',
  'ph-tirage',
  'cal-marquepage',
]);

const OBJECT_KEYS: Record<string, ObjectMockupKey> = {
  'gd-mug': 'mug',
  'pkg-gobelet': 'cup',
  'gd-gourde': 'bottle',
  'gd-stylo': 'pen',
  'gd-portecles': 'keychain',
  'gd-pins': 'pin',
  'gd-usb': 'usb',
  'evt-badge': 'badge',
  'doc-tampon': 'generic',
  'pkg-boite': 'box',
  'pkg-doypack': 'pouch',
  'pkg-sac': 'bag',
  'evt-pochette': 'pouch',
  'gd-housse': 'pouch',
  'tx-trousse': 'pouch',
  'tx-totebag': 'bag',
  'gd-parapluie': 'umbrella',
  'gd-briquet': 'lighter',
  'gd-tapis': 'mousepad',
  'gd-tasse': 'generic',
};

const INTERACTIVE_3D = new Set(['plv-rollup', 'plv-xbanner', 'gd-mug', 'pkg-boite', 'plv-oriflamme']);

export function resolveProductFamily(productId: string, category: string): ProductPreviewFamily {
  if (PAPER_IDS.has(productId)) return 'papier-petit-format';
  if (BOOKLET_IDS.has(productId)) return 'livrets-publications';
  if (category === 'finitions') return 'reliure-faconnage';
  if (category === 'conception' || productId === 'cg-hub') return 'services-graphiques';
  if (category === 'textile') return 'textile';
  if (category === 'goodies' || category === 'packaging') return 'objet-personnalise';
  if (category === 'grand_format') {
    return RIGID_GF.has(productId) ? 'grand-format-rigide' : 'grand-format-souple';
  }
  if (category === 'plv' || VERTICAL_PLV.has(productId)) return 'support-vertical-evenementiel';
  if (category === 'evenementiel') {
    if (productId === 'evt-photobooth') return 'objet-personnalise';
    if (productId === 'evt-bracelet' || productId === 'evt-cordon' || productId === 'evt-badge') {
      return 'objet-personnalise';
    }
    if (productId === 'evt-affiche' || productId === 'evt-billet') return 'papier-petit-format';
    return 'support-vertical-evenementiel';
  }
  if (category === 'livres') return 'livrets-publications';
  if (category === 'calendrier') {
    if (productId.startsWith('cal-chevalet')) return 'support-vertical-evenementiel';
    return 'livrets-publications';
  }
  if (category === 'notes') return 'livrets-publications';
  if (category === 'photo') return productId === 'ph-cadre' ? 'grand-format-rigide' : 'papier-petit-format';
  if (category === 'document') {
    if (productId === 'doc-tampon') return 'objet-personnalise';
    return 'papier-petit-format';
  }
  if (category === 'impression') return 'papier-petit-format';
  return 'papier-petit-format';
}

export function resolveFallbackComponent(
  family: ProductPreviewFamily,
  productId: string,
): FallbackComponentKey {
  switch (family) {
    case 'papier-petit-format':
      return 'PaperFallback';
    case 'livrets-publications':
      return 'BookletFallback';
    case 'reliure-faconnage':
      return 'BindingFallback';
    case 'grand-format-souple':
      return 'FlexibleLargeFormatFallback';
    case 'grand-format-rigide':
      return 'RigidPanelFallback';
    case 'support-vertical-evenementiel':
      return 'VerticalDisplayFallback';
    case 'textile':
      return 'TextileFallback';
    case 'objet-personnalise':
      return 'ObjectFallback';
    case 'services-graphiques':
      return 'GraphicServiceFallback';
    default:
      return 'PaperFallback';
  }
}

export function resolveMockupKey(productId: string, category: string): ObjectMockupKey | string | undefined {
  if (OBJECT_KEYS[productId]) return OBJECT_KEYS[productId];
  if (MUG_PRODUCT_IDS.has(productId)) return 'mug';
  if (category === 'textile') return 'generic';
  return undefined;
}

export function resolvePreviewMode(productId: string): PreviewModeKind {
  if (INTERACTIVE_3D.has(productId)) return 'interactive-3d';
  return 'pseudo-3d';
}

export function resolveDimensionMode(family: ProductPreviewFamily, productId: string): DimensionMode {
  if (family === 'objet-personnalise') return 'object';
  if (family === 'grand-format-souple' || family === 'grand-format-rigide') return 'surface-based';
  if (family === 'reliure-faconnage') return 'fixed-format';
  if (productId.startsWith('fly-') || productId.startsWith('cv-')) return 'fixed-format';
  return 'custom-size';
}

export function resolveOrientationModeForProduct(
  family: ProductPreviewFamily,
  productId: string,
): OrientationMode {
  if (family === 'support-vertical-evenementiel') return 'portrait';
  if (family === 'objet-personnalise') return 'square';
  if (productId === 'plv-xbanner') return 'portrait';
  return 'auto';
}

export function scaleReferenceFor(family: ProductPreviewFamily, productId: string): boolean {
  return (
    family === 'grand-format-souple' ||
    family === 'grand-format-rigide' ||
    family === 'support-vertical-evenementiel' ||
    productId === 'gf-bache' ||
    productId === 'plv-rollup'
  );
}

export const FAMILY_LABELS: Record<ProductPreviewFamily, string> = {
  'papier-petit-format': 'Papier petit format',
  'livrets-publications': 'Livrets & publications',
  'reliure-faconnage': 'Reliure & façonnage',
  'grand-format-souple': 'Grand format souple',
  'grand-format-rigide': 'Grand format rigide',
  'support-vertical-evenementiel': 'Support vertical / événementiel',
  textile: 'Textile',
  'objet-personnalise': 'Objet personnalisé',
  'services-graphiques': 'Services graphiques',
};
