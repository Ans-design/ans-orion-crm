import type { ProductConfig } from '@/lib/data/config-types';
import type { GfStockKind } from '@/lib/grand-format/types';
import type { GfAdminPricingConfig } from '@/lib/grand-format/gf-admin-config';
import { getGfArticleMeta } from '@/lib/grand-format/article-meta';
import { gfLaizeFallbackCm } from '@/lib/grand-format/laize-fallbacks';
import { laizeCmToChipLabel, parseLaizeLabelToCm } from '@/lib/grand-format/laize-utils';

export type GfApiLaizeChip = {
  label: string;
  cm: number | null;
  available: boolean;
  quantity: number;
  rupture: boolean;
  fallback?: boolean;
};

export type GfApiProfile = {
  articleId: string;
  stockKind: GfStockKind;
  laizes: GfApiLaizeChip[];
  laizeChipLabels: string[];
  prixA0: number | null;
  prixM2: number | null;
  source?: string;
  adminPricing?: GfAdminPricingConfig;
};

/** Union laizes métier (fallback) + stock — affichage permanent en POS. */
export function mergeGfLaizeChipsWithFallback(
  articleId: string,
  stockLaizes: GfApiLaizeChip[],
): GfApiLaizeChip[] {
  if (!getGfArticleMeta(articleId)) return stockLaizes;

  const byCm = new Map<number, GfApiLaizeChip>();

  for (const cm of gfLaizeFallbackCm(articleId)) {
    byCm.set(cm, {
      label: laizeCmToChipLabel(cm),
      cm,
      available: true,
      quantity: 0,
      rupture: false,
      fallback: true,
    });
  }

  for (const l of stockLaizes) {
    const cm = l.cm ?? parseLaizeLabelToCm(l.label);
    if (cm == null || cm <= 0) continue;
    byCm.set(cm, {
      ...l,
      label: l.label || laizeCmToChipLabel(cm),
      cm,
      rupture: !l.available,
      fallback: false,
    });
  }

  return [...byCm.values()].sort((a, b) => (a.cm ?? 0) - (b.cm ?? 0));
}

export function laizeChipLabelsFromMerged(merged: GfApiLaizeChip[]): string[] {
  const labels = merged.map((l) => l.label).filter(Boolean);
  if (!labels.includes('Autres')) labels.push('Autres');
  return labels;
}

/** Laizes métier immédiates (sans attendre l’API stock). */
export function injectGfLaizeFallbacksIntoProductConfig(
  productConfig: ProductConfig | null,
  articleId: string,
): ProductConfig | null {
  if (!productConfig || !getGfArticleMeta(articleId)) return productConfig;

  const laizeLabels = laizeChipLabelsFromMerged(
    mergeGfLaizeChipsWithFallback(articleId, []),
  );
  if (laizeLabels.length <= 1) return productConfig;

  return {
    ...productConfig,
    sections: productConfig.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        if (field.key === 'laize' || field.key === 'laize_plaque') {
          return { ...field, options: laizeLabels };
        }
        return field;
      }),
    })),
  };
}

/** Injecte les laizes stock + fallback dans la config produit. */
export function mergeGfProfileIntoProductConfig(
  productConfig: ProductConfig | null,
  profile: GfApiProfile | null,
): ProductConfig | null {
  if (!productConfig) return productConfig;

  const articleId = profile?.articleId;
  const mergedLaizes = articleId
    ? mergeGfLaizeChipsWithFallback(articleId, profile?.laizes ?? [])
    : [];
  const laizeLabels =
    mergedLaizes.length > 0
      ? laizeChipLabelsFromMerged(mergedLaizes)
      : articleId
        ? laizeChipLabelsFromMerged(mergeGfLaizeChipsWithFallback(articleId, []))
        : [];

  if (!profile && laizeLabels.length <= 1) return productConfig;

  const prixM2 = profile
    ? profile.prixA0 ?? profile.prixM2 ?? productConfig.prixM2
    : productConfig.prixM2;

  if (laizeLabels.length <= 1) {
    return { ...productConfig, prixM2 };
  }

  return {
    ...productConfig,
    prixM2,
    sections: productConfig.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        if (field.key === 'laize' || field.key === 'laize_plaque') {
          return { ...field, options: laizeLabels };
        }
        return field;
      }),
    })),
  };
}

export function availableLaizesCmFromProfile(
  profile: GfApiProfile | null,
  articleId?: string,
): number[] {
  const id = profile?.articleId ?? articleId;
  if (!id) return [];
  const merged = mergeGfLaizeChipsWithFallback(id, profile?.laizes ?? []);
  const cms = merged
    .map((l) => l.cm ?? parseLaizeLabelToCm(l.label))
    .filter((cm): cm is number => cm != null && cm > 0);
  return [...new Set(cms)].sort((a, b) => a - b);
}

export function gfLaizeAvailabilityMap(
  profile: GfApiProfile | null,
  articleId?: string,
): Record<string, boolean> {
  const id = profile?.articleId ?? articleId;
  if (!id) return {};
  const merged = mergeGfLaizeChipsWithFallback(id, profile?.laizes ?? []);
  const map: Record<string, boolean> = {};
  for (const l of merged) {
    map[l.label] = l.available;
  }
  return map;
}
