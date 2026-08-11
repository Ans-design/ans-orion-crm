import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import {
  FAMILY_LABELS,
  resolveDimensionMode,
  resolveFallbackComponent,
  resolveMockupKey,
  resolveOrientationModeForProduct,
  resolvePreviewMode,
  resolveProductFamily,
  scaleReferenceFor,
} from '@/lib/pos-preview/product-preview.families';
import type { ProductPreviewRegistryEntry } from '@/lib/pos-preview/product-preview.types';

const FORBIDDEN_LEGACY = [
  '/assets/products/fallbacks/mug-white.svg',
  '/assets/products/studio/mug.svg',
  '/assets/products/studio/cup.svg',
  '/assets/products/studio/book.svg',
  '/assets/products/studio/flat.svg',
];

function slugFromId(id: string): string {
  return id.replace(/_/g, '-');
}

function materialRulesFor(family: string, productId: string): string[] {
  if (family === 'grand-format-souple') {
    if (productId.includes('vinyl')) return ['adhesive', 'white', 'corner-peel'];
    if (productId === 'gf-bache') return ['mesh', 'grommets', 'flexible'];
    return ['flexible', 'large-format'];
  }
  if (family === 'grand-format-rigide') {
    if (productId.includes('plexi') || productId.includes('acrylic')) return ['transparent', 'rigid', 'reflection'];
    return ['rigid', 'panel'];
  }
  if (family === 'livrets-publications') return ['paper', 'pages', 'spine'];
  if (family === 'textile') return ['fabric', 'garment'];
  if (family === 'objet-personnalise') return ['object', 'volume'];
  return ['paper'];
}

function buildEntry(item: (typeof POS_CATALOGUE)[number]): ProductPreviewRegistryEntry {
  const family = resolveProductFamily(item.id, item.category);
  const fallbackComponent = resolveFallbackComponent(family, item.id);
  const previewMode = resolvePreviewMode(item.id);
  const mockupKey = resolveMockupKey(item.id, item.category);

  return {
    productId: item.id,
    productSlug: slugFromId(item.id),
    productName: item.name,
    categoryId: item.category,
    family,
    previewMode,
    fallbackComponent,
    mockupKey,
    allowedAssets: [],
    forbiddenAssets: [...FORBIDDEN_LEGACY],
    dimensionMode: resolveDimensionMode(family, item.id),
    orientationMode: resolveOrientationModeForProduct(family, item.id),
    textureMapping: family !== 'reliure-faconnage' && family !== 'services-graphiques',
    scaleReference: scaleReferenceFor(family, item.id),
    supportsUploadedDesign: family !== 'reliure-faconnage' && family !== 'services-graphiques',
    materialRules: materialRulesFor(family, item.id),
    finishRules: ['mat', 'brillant', 'pelliculage'],
    fallbackIcon: item.icon || '📄',
    mockup3D:
      previewMode === 'interactive-3d' && item.id === 'plv-rollup'
        ? '/mockups/3d/rollup-placeholder.glb'
        : undefined,
  };
}

/** Registre central — produits POS visibles (dérivé de POS_CATALOGUE) */
export const PRODUCT_PREVIEW_REGISTRY: Record<string, ProductPreviewRegistryEntry> =
  Object.fromEntries(POS_CATALOGUE.map((item) => [item.id, buildEntry(item)]));

export function getProductPreviewEntry(productId: string): ProductPreviewRegistryEntry | null {
  return PRODUCT_PREVIEW_REGISTRY[productId] ?? null;
}

export function listProductPreviewEntries(): ProductPreviewRegistryEntry[] {
  return Object.values(PRODUCT_PREVIEW_REGISTRY);
}

export function getFamilyLabel(family: ProductPreviewRegistryEntry['family']): string {
  return FAMILY_LABELS[family] ?? family;
}

export const PRODUCT_PREVIEW_REGISTRY_COUNT = Object.keys(PRODUCT_PREVIEW_REGISTRY).length;
