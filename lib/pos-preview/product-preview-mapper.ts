import { resolveSilhouette } from '@/lib/data/article-silhouette';
import type { CatalogueItem } from '@/lib/data/catalogue';
import {
  getFinishVisualStyle,
  getMaterialVisualStyle,
} from '@/lib/pos-preview/material-preview.rules';
import {
  getFamilyLabel,
  getProductPreviewEntry,
} from '@/lib/pos-preview/product-preview.registry';
import type {
  ProductPreviewInput,
  ResolvedPreviewContext,
} from '@/lib/pos-preview/preview-types';
import {
  getOrientation,
  getScaleLabel,
  getSurfaceM2,
  normalizePreviewSize,
  shouldShowScaleReference,
} from '@/lib/pos-preview/ratio-utils';

const MAX_W = { compact: 140, configurator: 260, advanced: 320 } as const;
const MAX_H = { compact: 120, configurator: 300, advanced: 360 } as const;

function detectMissingFields(
  config: Record<string, unknown> | undefined,
  category: string,
): string[] {
  const missing: string[] = [];
  if (!config) return missing;

  if (category === 'grand_format') {
    if (!Number(config.largeur) && !Number(config.L)) missing.push('largeur');
    if (!Number(config.hauteur) && !Number(config.H)) missing.push('hauteur');
  }
  if (category === 'flyers' && !config.format) missing.push('format');
  if (category === 'carterie' && !config.grammage) missing.push('grammage');
  return missing;
}

function materialKeyFromEntry(entry: NonNullable<ReturnType<typeof getProductPreviewEntry>>): string {
  const rules = entry.materialRules;
  if (rules.includes('adhesive')) return 'vinyl';
  if (rules.includes('transparent')) return 'transparent';
  if (rules.includes('fabric') || rules.includes('mesh')) return 'fabric';
  if (rules.includes('rigid')) return 'white';
  return rules[0] ?? 'white';
}

/** Résout le contexte complet de preview pour un produit POS */
export function resolvePreviewContext(input: ProductPreviewInput): ResolvedPreviewContext {
  const mode = input.mode ?? 'configurator';
  const product = input.product;
  const config = input.selectedOptions ?? {};
  const item = product as Pick<CatalogueItem, 'id' | 'name' | 'category'>;

  const entry = getProductPreviewEntry(product.id);
  if (!entry) {
    throw new Error(`Preview registry missing for ${product.id}`);
  }

  const spec = resolveSilhouette(item, config);
  let widthMm = spec.widthMm;
  let heightMm = spec.heightMm;
  if (spec.orientation === 'landscape' && widthMm < heightMm) {
    [widthMm, heightMm] = [heightMm, widthMm];
  }

  const orientation = getOrientation(widthMm, heightMm);
  const maxW = MAX_W[mode];
  const maxH = MAX_H[mode];
  const { width, height } = normalizePreviewSize(widthMm, heightMm, maxW, maxH);

  const materialVisual = getMaterialVisualStyle(materialKeyFromEntry(entry), config);
  const finishVisual = getFinishVisualStyle(config);
  const missingFields = detectMissingFields(config, product.category);

  const scaleRef = entry.scaleReference || shouldShowScaleReference(widthMm, heightMm);
  const surfaceM2 =
    product.category === 'grand_format' ? getSurfaceM2(widthMm, heightMm) : undefined;

  const objectFill = entry.dimensionMode === 'object';
  const displayWidth = objectFill ? Math.min(maxW * 0.55, width * 1.4) : width;
  const displayHeight = objectFill ? Math.min(maxH * 0.62, height * 1.4) : height;

  return {
    entry,
    orientation,
    ratio: widthMm / heightMm,
    displayWidth: Math.round(displayWidth),
    displayHeight: Math.round(displayHeight),
    scaleLabel: getScaleLabel(widthMm, heightMm),
    surfaceM2,
    materialVisual,
    finishVisual,
    missingFields,
    useAdvanced3D: mode === 'advanced' && entry.previewMode === 'interactive-3d',
    familyLabel: getFamilyLabel(entry.family),
    indicative: true,
  };
}

export { getPreviewPerspectiveClass, getPreviewShadowStyle } from '@/lib/pos-preview/preview-types';
