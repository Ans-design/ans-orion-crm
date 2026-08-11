import { calculateCustomDimensionsSurface } from '@/lib/packaging/custom-dimensions-surface';
import { resolveDisplayFormatLabel } from '@/lib/pos/generated-format-label';

export const SURFACE_SNAPSHOT_VERSION = 'surf-v1';

export type CustomSurfaceSnapshot = {
  formulaVersion: string;
  formatLabel: string;
  widthMm: number;
  heightMm: number;
  realSurfaceM2: number;
  grossSurfaceM2: number;
  totalGrossSurfaceM2: number;
  wasteMarginMm: number;
  grossWidthMm: number;
  grossHeightMm: number;
  quantity: number;
  unitPrice: number;
  createdAt: string;
};

export function shouldUseCustomSurfaceSnapshot(articleId: string): boolean {
  if (articleId.startsWith('pkg-') || articleId.startsWith('cal-') || articleId.startsWith('gf-')) {
    return false;
  }
  return true;
}

export function buildCustomSurfaceSnapshotForArticle(
  articleId: string,
  config: Record<string, unknown>,
  opts: { unitPrice: number; qty: number },
): CustomSurfaceSnapshot | null {
  if (!shouldUseCustomSurfaceSnapshot(articleId)) return null;
  const surface = calculateCustomDimensionsSurface(config);
  if (!surface) return null;

  const grossWidthMm = surface.longueurMm + 100;
  const grossHeightMm = surface.largeurMm + 100;
  const realSurfaceM2 = parseFloat((surface.surfaceCm2 / 10_000).toFixed(6));
  const grossSurfaceM2 = parseFloat((surface.surfaceBruteCm2 / 10_000).toFixed(6));

  return {
    formulaVersion: SURFACE_SNAPSHOT_VERSION,
    formatLabel: resolveDisplayFormatLabel(config),
    widthMm: surface.longueurMm,
    heightMm: surface.largeurMm,
    realSurfaceM2,
    grossSurfaceM2,
    totalGrossSurfaceM2: parseFloat((grossSurfaceM2 * opts.qty).toFixed(6)),
    wasteMarginMm: surface.margeChuteMm,
    grossWidthMm,
    grossHeightMm,
    quantity: opts.qty,
    unitPrice: opts.unitPrice,
    createdAt: new Date().toISOString(),
  };
}

export function readCustomSurfaceSnapshotFromConfig(
  config: Record<string, unknown>,
): CustomSurfaceSnapshot | null {
  const raw = config._surfaceSnapshot;
  if (!raw || typeof raw !== 'object') return null;
  return raw as CustomSurfaceSnapshot;
}
