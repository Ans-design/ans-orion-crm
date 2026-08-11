/** Types centralisés — aperçus produit POS ANS ORION */

export type ProductPreviewFamily =
  | 'papier-petit-format'
  | 'livrets-publications'
  | 'reliure-faconnage'
  | 'grand-format-souple'
  | 'grand-format-rigide'
  | 'support-vertical-evenementiel'
  | 'textile'
  | 'objet-personnalise'
  | 'services-graphiques';

export type PreviewModeKind = 'fallback-2d' | 'pseudo-3d' | 'interactive-3d';

export type FallbackComponentKey =
  | 'PaperFallback'
  | 'BookletFallback'
  | 'BindingFallback'
  | 'FlexibleLargeFormatFallback'
  | 'RigidPanelFallback'
  | 'VerticalDisplayFallback'
  | 'TextileFallback'
  | 'ObjectFallback'
  | 'GraphicServiceFallback';

export type DimensionMode = 'fixed-format' | 'custom-size' | 'surface-based' | 'object';

export type OrientationMode = 'portrait' | 'landscape' | 'square' | 'auto';

/** Sous-type visuel pour objets (mug ≠ gourde ≠ stylo) */
export type ObjectMockupKey =
  | 'mug'
  | 'cup'
  | 'bottle'
  | 'pen'
  | 'keychain'
  | 'pin'
  | 'usb'
  | 'badge'
  | 'box'
  | 'pouch'
  | 'bag'
  | 'umbrella'
  | 'lighter'
  | 'mousepad'
  | 'phone'
  | 'generic';

export type ProductPreviewRegistryEntry = {
  productId: string;
  productSlug: string;
  productName: string;
  categoryId: string;
  family: ProductPreviewFamily;
  previewMode: PreviewModeKind;
  fallbackComponent: FallbackComponentKey;
  mockupKey?: ObjectMockupKey | string;
  allowedAssets: string[];
  forbiddenAssets: string[];
  dimensionMode: DimensionMode;
  orientationMode: OrientationMode;
  textureMapping: boolean;
  scaleReference: boolean;
  supportsUploadedDesign: boolean;
  materialRules: string[];
  finishRules: string[];
  fallbackIcon: string;
  mockup2D?: string;
  mockup3D?: string;
};

export type PreviewDisplayMode = 'compact' | 'configurator' | 'advanced';

export type ProductPreviewInput = {
  product: { id: string; name: string; category: string; icon: string };
  selectedOptions?: Record<string, unknown>;
  dimensions?: { width: number; height: number; depth?: number; unit: 'mm' | 'cm' | 'm' };
  quantity?: number;
  uploadedDesign?: string | null;
  mode?: PreviewDisplayMode;
};

export type FallbackRenderProps = {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape' | 'square';
  productName: string;
  mockupKey?: string;
  materialLabel?: string;
  finishLabel?: string;
  uploadedDesign?: string | null;
  indicative?: boolean;
};

/** Assets legacy interdits dans le nouveau moteur POS */
export const DEPRECATED_ASSET_PATTERNS = [
  '/assets/products/fallbacks/mug-white.svg',
  '/mockups/_deprecated/',
] as const;

/** Seul ce produit peut utiliser mockupKey mug */
export const MUG_PRODUCT_IDS = new Set(['gd-mug']);

export const CUP_PRODUCT_IDS = new Set(['pkg-gobelet']);
