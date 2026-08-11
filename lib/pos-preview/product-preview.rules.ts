import { FAMILY_LABELS } from '@/lib/pos-preview/product-preview.families';

/** Règles globales moteur aperçu POS */
export const PREVIEW_FAMILY_LABELS = FAMILY_LABELS;

export const PREVIEW_RULES = {
  gridUses2DOnly: true,
  advanced3DLazy: true,
  fallbackToSvg: true,
  respectLiveDimensions: true,
  noLegacyStudioAssets: true,
} as const;
