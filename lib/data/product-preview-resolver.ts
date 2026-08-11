import type { MockupKind } from '@/lib/data/article-mockup-registry';
import { getResolvedMockupDef, resolveMockupKind } from '@/lib/data/mockup-resolver';
import {
  CATEGORY_PREVIEW_FALLBACKS,
  getProductPreviewConfig,
  PREVIEW_TYPE_LABELS,
  type ProductPreviewConfig,
  type PreviewVariantRule,
} from '@/lib/data/product-preview-config';
import { getStudioAssetForPreview } from '@/lib/data/preview-studio-assets';

export type PreviewAdminOverride = {
  articleId?: string;
  assetPath?: string | null;
  previewType?: MockupKind;
  previewLabel?: string;
  isActive?: boolean;
  categoryFallbackAsset?: string | null;
};

export type ResolvedProductPreview = {
  articleId: string;
  categoryId: string;
  previewType: MockupKind;
  previewLabel: string;
  assetPath: string | null;
  categoryFallbackAsset: string | null;
  useImageAsset: boolean;
  landscape: boolean;
  roundedCorners: boolean;
  showRectoVersoBadge: boolean;
  isActive: boolean;
  source: 'article' | 'category' | 'svg';
};

function matchRule(val: unknown, rule: PreviewVariantRule): boolean {
  if (val === undefined || val === null || val === '') return false;
  const s = String(val).toLowerCase();
  return rule.match.some((m) => s.includes(m.toLowerCase()));
}

function applyVariantRules(
  config: Record<string, unknown> | undefined,
  rules: PreviewVariantRule[] | undefined,
): Pick<ResolvedProductPreview, 'landscape' | 'roundedCorners' | 'showRectoVersoBadge'> {
  let landscape = false;
  let roundedCorners = false;
  let showRectoVersoBadge = false;

  if (!config || !rules?.length) {
    return { landscape, roundedCorners, showRectoVersoBadge };
  }

  for (const rule of rules) {
    const val = config[rule.configKey];
    if (Array.isArray(val)) {
      const joined = val.join(' ').toLowerCase();
      if (rule.match.some((m) => joined.includes(m.toLowerCase()))) {
        if (rule.landscape) landscape = true;
        if (rule.roundedCorners) roundedCorners = true;
        if (rule.showRectoVersoBadge) showRectoVersoBadge = true;
      }
      continue;
    }
    if (!matchRule(val, rule)) continue;
    if (rule.landscape) landscape = true;
    if (rule.roundedCorners) roundedCorners = true;
    if (rule.showRectoVersoBadge) showRectoVersoBadge = true;
  }

  // Face recto-verso explicite
  const face = String(config.face ?? '').toLowerCase();
  if (face.includes('recto-verso') || face.includes('recto verso') || face.includes('r/v')) {
    showRectoVersoBadge = true;
  }

  // Format paysage via silhouette
  const fmt = String(config.format ?? config.dim ?? '').toLowerCase();
  if (['a4', 'a3', 'a5'].includes(fmt) && config.orientation === 'landscape') {
    landscape = true;
  }

  return { landscape, roundedCorners, showRectoVersoBadge };
}

/** Vérifie si un asset statique existe côté client (HEAD via img onError fallback). */
export function resolveProductPreview(
  articleId: string,
  categoryId: string,
  config?: Record<string, unknown>,
  adminOverride?: PreviewAdminOverride | null,
): ResolvedProductPreview {
  const base = getProductPreviewConfig(articleId);
  const mockDef = getResolvedMockupDef(articleId, categoryId, config);
  const previewType =
    adminOverride?.previewType ??
    base?.previewType ??
    mockDef?.kind ??
    resolveMockupKind(articleId, categoryId, config);

  const previewLabel =
    adminOverride?.previewLabel ??
    base?.previewLabel ??
    PREVIEW_TYPE_LABELS[previewType] ??
    'Produit';

  const variants = applyVariantRules(config, base?.variantRules);

  const studioAsset = getStudioAssetForPreview(articleId, previewType);
  const articleAsset =
    adminOverride?.assetPath ?? base?.assetPath ?? studioAsset ?? null;
  const categoryAsset =
    adminOverride?.categoryFallbackAsset ??
    base?.categoryFallbackAsset ??
    CATEGORY_PREVIEW_FALLBACKS[categoryId] ??
    null;

  const effectiveAsset = articleAsset ?? (previewType === 'flat' ? categoryAsset : null);

  const isActive = adminOverride?.isActive ?? base?.isActive ?? true;

  return {
    articleId,
    categoryId,
    previewType,
    previewLabel,
    assetPath: effectiveAsset,
    categoryFallbackAsset: categoryAsset,
    useImageAsset: Boolean(effectiveAsset),
    ...variants,
    isActive,
    source: articleAsset
      ? (adminOverride?.assetPath || base?.assetPath ? 'article' : 'category')
      : effectiveAsset
        ? 'category'
        : 'svg',
  };
}
