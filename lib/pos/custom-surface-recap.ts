import { calculateCustomDimensionsSurface } from '@/lib/packaging/custom-dimensions-surface';
import { resolveDisplayFormatLabel } from '@/lib/pos/generated-format-label';
import { shouldUseCustomSurfaceSnapshot } from '@/lib/pos/surface-snapshot';

export type CustomSurfaceRecap = {
  formatLabel: string;
  widthMm: number;
  heightMm: number;
  realSurfaceM2: number;
  grossSurfaceM2: number;
  totalGrossSurfaceM2: number;
  wasteMarginMm: number;
  grossWidthMm: number;
  grossHeightMm: number;
  margeRule: string;
};

/** Récap surface L×l (hors packaging / calendrier / grand format). */
export function resolveCustomSurfaceRecap(
  articleId: string,
  config: Record<string, unknown>,
  qty = 1,
): CustomSurfaceRecap | null {
  if (!shouldUseCustomSurfaceSnapshot(articleId)) return null;
  const surface = calculateCustomDimensionsSurface(config);
  if (!surface) return null;

  const grossWidthMm = surface.longueurMm + 100;
  const grossHeightMm = surface.largeurMm + 100;
  const realSurfaceM2 = parseFloat((surface.surfaceCm2 / 10_000).toFixed(6));
  const grossSurfaceM2 = parseFloat((surface.surfaceBruteCm2 / 10_000).toFixed(6));

  return {
    formatLabel: resolveDisplayFormatLabel(config),
    widthMm: surface.longueurMm,
    heightMm: surface.largeurMm,
    realSurfaceM2,
    grossSurfaceM2,
    totalGrossSurfaceM2: parseFloat((grossSurfaceM2 * qty).toFixed(6)),
    wasteMarginMm: surface.margeChuteMm,
    grossWidthMm,
    grossHeightMm,
    margeRule: `Surface nette L×l — brute +100 mm — chute +${surface.margeChuteMm} mm/côté`,
  };
}
