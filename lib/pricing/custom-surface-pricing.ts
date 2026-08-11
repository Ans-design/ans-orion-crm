import type { ProductConfig } from '@/lib/data/config-types';
import { resolveCustomSurfaceRecap } from '@/lib/pos/custom-surface-recap';
import type { CustomSurfaceRecap } from '@/lib/pos/custom-surface-recap';

export type CustomSurfacePriceResult = {
  calculable: boolean;
  prixUnitaire: number;
  recap?: CustomSurfaceRecap;
  formula?: string;
  priceSource: 'customSurfaceM2' | 'customSurfaceCm2' | null;
};

export function computeCustomSurfacePrice(
  articleId: string,
  config: Record<string, unknown>,
  productConfig: ProductConfig | null | undefined,
  qty: number,
): CustomSurfacePriceResult {
  const recap = resolveCustomSurfaceRecap(articleId, config, qty);
  if (!recap) {
    return { calculable: false, prixUnitaire: 0, priceSource: null };
  }

  if (productConfig?.prixM2 && productConfig.prixM2 > 0) {
    const prixUnitaire = Math.round(productConfig.prixM2 * recap.grossSurfaceM2);
    return {
      calculable: prixUnitaire > 0,
      prixUnitaire,
      recap,
      priceSource: 'customSurfaceM2',
      formula: `prixM2 (${productConfig.prixM2}) × surface_brute (${recap.grossSurfaceM2} m²)`,
    };
  }

  if (productConfig?.prixCm2 && productConfig.prixCm2 > 0) {
    const prixUnitaire = Math.round(productConfig.prixCm2 * recap.grossSurfaceM2 * 10_000);
    return {
      calculable: prixUnitaire > 0,
      prixUnitaire,
      recap,
      priceSource: 'customSurfaceCm2',
      formula: `prixCm2 (${productConfig.prixCm2}) × surface_brute cm²`,
    };
  }

  return { calculable: false, prixUnitaire: 0, recap, priceSource: null };
}
