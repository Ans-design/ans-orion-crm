import { PACKAGING_CHUTE_MM } from '@/lib/packaging/material-recap';

export type CustomDimensionsSurface = {
  kind: 'custom-dimensions';
  longueurMm: number;
  largeurMm: number;
  surfaceCm2: number;
  surfaceBruteCm2: number;
  surfaceChuteCm2: number;
  margeChuteMm: number;
};

function parseMm(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function isCustomFormatConfig(config: Record<string, unknown>): boolean {
  for (const key of ['format', 'dimension', 'diametre', 'taille', 'format_marquage']) {
    if (/personnalis/i.test(String(config[key] ?? ''))) return true;
  }
  return false;
}

function circleSurfaceCm2(diameterMm: number, marginMm = 0): number {
  const d = diameterMm + marginMm;
  return (Math.PI * (d / 2) ** 2) / 100;
}

/** Surface L×l ou Ø (mm) → cm² ; brute +100 mm ; chute +50 mm par côté (configurable). */
export function calculateCustomDimensionsSurface(
  config: Record<string, unknown>,
  margeChuteMm = PACKAGING_CHUTE_MM,
): CustomDimensionsSurface | null {
  if (!isCustomFormatConfig(config)) return null;

  const diametreMm = parseMm(config.diametre_mm);
  if (diametreMm != null) {
    const surfaceCm2 = circleSurfaceCm2(diametreMm);
    const surfaceBruteCm2 = circleSurfaceCm2(diametreMm, 100);
    const surfaceChuteCm2 = circleSurfaceCm2(diametreMm, margeChuteMm * 2);
    return {
      kind: 'custom-dimensions',
      longueurMm: diametreMm,
      largeurMm: diametreMm,
      surfaceCm2,
      surfaceBruteCm2,
      surfaceChuteCm2,
      margeChuteMm,
    };
  }

  const longueurMm = parseMm(config.longueur);
  const largeurMm = parseMm(config.largeur);
  if (longueurMm == null || largeurMm == null) return null;

  const surfaceCm2 = (longueurMm * largeurMm) / 100;
  const bruteL = longueurMm + 100;
  const bruteW = largeurMm + 100;
  const surfaceBruteCm2 = (bruteL * bruteW) / 100;
  const chuteL = longueurMm + margeChuteMm * 2;
  const chuteW = largeurMm + margeChuteMm * 2;
  const surfaceChuteCm2 = (chuteL * chuteW) / 100;

  return {
    kind: 'custom-dimensions',
    longueurMm,
    largeurMm,
    surfaceCm2,
    surfaceBruteCm2,
    surfaceChuteCm2,
    margeChuteMm,
  };
}
