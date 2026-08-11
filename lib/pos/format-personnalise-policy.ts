import type { ProductConfig, ConfigField } from '@/lib/data/config-types';
import { shouldMaterialColorForcePrice, isMaterialPaletteField } from '@/lib/pos/material-color-pricing-policy';

/** Articles concernés par les prompts POS packaging / calendrier uniquement. */
export function isPosPromptScopedArticle(articleId: string): boolean {
  return articleId.startsWith('cal-') || articleId.startsWith('pkg-');
}

const DEDICATED_DIMENSION_KEYS = new Set([
  'longueur',
  'largeur',
  'hauteur',
  'profondeur',
  'custom_width',
  'custom_height',
  'custom_gusset',
  'longueur_cm',
  'largeur_cm',
  'zone_impression_longueur',
  'zone_impression_largeur',
  'diametre_mm',
  'cote',
]);

/** Articles avec champs numériques dimensionnels — pas de bloc texte « Dimensions personnalisées ». */
export function productHasDedicatedDimensionFields(
  productConfig: ProductConfig | null | undefined,
): boolean {
  if (!productConfig?.sections) return false;
  for (const section of productConfig.sections) {
    const keys = new Set(section.fields.map((f) => f.key));
    if (keys.has('longueur') && keys.has('largeur')) return true;
    if (keys.has('custom_width') && keys.has('custom_height')) return true;
    if (keys.has('longueur_cm') && keys.has('largeur_cm')) return true;
    if (keys.has('zone_impression_longueur') && keys.has('zone_impression_largeur')) return true;
    if (keys.has('diametre_mm')) return true;
    if ([...DEDICATED_DIMENSION_KEYS].some((k) => keys.has(k) && keys.size >= 2)) {
      const hasNumber = section.fields.some(
        (f) => f.type === 'number' && DEDICATED_DIMENSION_KEYS.has(f.key),
      );
      if (hasNumber) return true;
    }
  }
  return false;
}

/** @deprecated Utiliser productHasDedicatedDimensionFields */
export function productHasDedicatedLxLFields(productConfig: ProductConfig | null | undefined): boolean {
  return productHasDedicatedDimensionFields(productConfig);
}

export function isFormatPersonnaliseActive(config: Record<string, unknown>): boolean {
  for (const key of ['format', 'format_marquage', 'dimension', 'diametre', 'taille']) {
    const val = String(config[key] ?? '');
    if (/personnalis/i.test(val)) return true;
  }
  const l = Number(config.longueur);
  const w = Number(config.largeur);
  return Number.isFinite(l) && l > 0 && Number.isFinite(w) && w > 0;
}

/** Alerte « prix forcé » — pas sur format personnalisé si L×l dédiés ; couleur matière sans impact prix. */
export function shouldShowForcedPriceWarning(
  field: { key?: string; type?: ConfigField['type']; forcePriceValues?: string[] },
  option: string,
  productConfig: ProductConfig | null | undefined,
  _articleId?: string,
): boolean {
  if (!field.forcePriceValues?.includes(option)) return false;

  if (isMaterialPaletteField({ key: field.key ?? '', type: field.type ?? 'chips' })) {
    return shouldMaterialColorForcePrice(
      { key: field.key ?? '', type: field.type ?? 'chips', forcePriceValues: field.forcePriceValues },
      option,
    );
  }

  if (productHasDedicatedDimensionFields(productConfig)) return false;
  return true;
}
