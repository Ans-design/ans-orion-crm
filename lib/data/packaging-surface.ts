import type { BoxCalculationResult } from '@/lib/packaging/box-calculation';
import { calculateBoxPackaging } from '@/lib/packaging/box-calculation';

export type PackagingSurfaceCore = Pick<
  BoxCalculationResult,
  | 'structure'
  | 'L'
  | 'H'
  | 'P'
  | 'devW'
  | 'devH'
  | 'brutW'
  | 'brutH'
  | 'formatDeveloppe'
  | 'formatBrut'
  | 'surfaceMm2'
  | 'surfaceCm2'
  | 'surfaceM2'
  | 'margeSecurite'
  | 'margeRule'
>;

export type PackagingSurfaceResult = PackagingSurfaceCore &
  Partial<Omit<BoxCalculationResult, keyof PackagingSurfaceCore>>;

/** @deprecated Utiliser calculateBoxPackaging — conservé pour compatibilité imports */
export function calculatePackagingSurface(config: Record<string, unknown>): PackagingSurfaceResult | null {
  return calculateBoxPackaging(config);
}
