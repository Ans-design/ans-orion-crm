import { calculateBoxPackaging } from '@/lib/packaging/box-calculation';
import { BOX_ADMIN_DEFAULTS } from '@/lib/packaging/box-admin-defaults';
import { calculateCustomDimensionsSurface } from '@/lib/packaging/custom-dimensions-surface';
import type { PackagingSurfaceCore, PackagingSurfaceResult } from '@/lib/data/packaging-surface';

export const PACKAGING_CHUTE_MM = 50;
export const PACKAGING_BLEED_MM = 3;
export const PACKAGING_GLUE_TAB_MM = 15;

function parseDim(val: unknown): number {
  if (val === '' || val === undefined || val === null) return 0;
  const n = parseFloat(String(val));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function fmt(w: number, h: number): string {
  return `${Math.round(w)} × ${Math.round(h)} mm`;
}

function toResult(
  partial: Omit<PackagingSurfaceCore, 'surfaceCm2' | 'surfaceM2'> & { surfaceMm2: number },
): PackagingSurfaceResult {
  const surfaceCm2 = Math.round(partial.surfaceMm2 / 100);
  const surfaceM2 = parseFloat((partial.surfaceMm2 / 1_000_000).toFixed(4));
  return { ...partial, surfaceCm2, surfaceM2 };
}

/** Gabarits impression totale gobelet (mm) — configurable admin plus tard */
const GOBELET_GABARITS_MM: Record<string, { w: number; h: number }> = {
  '4 oz (120 ml)': { w: 190, h: 55 },
  '6 oz (180 ml)': { w: 210, h: 65 },
  '8 oz (240 ml)': { w: 230, h: 75 },
  '10 oz (300 ml)': { w: 250, h: 85 },
  '12 oz (350 ml)': { w: 270, h: 95 },
  '16 oz (475 ml)': { w: 300, h: 105 },
  '120 ml': { w: 190, h: 55 },
  '180 ml': { w: 210, h: 65 },
  '250 ml': { w: 240, h: 80 },
  '330 ml': { w: 260, h: 90 },
  '500 ml': { w: 300, h: 105 },
};

function resolveGobeletTotaleGabarit(config: Record<string, unknown>): { w: number; h: number } | null {
  const contenance = String(config.contenance ?? '');
  if (contenance && contenance !== 'Autres') {
    return GOBELET_GABARITS_MM[contenance] ?? null;
  }
  const diametre = parseDim(config.gobelet_diametre_mm);
  const hauteur = parseDim(config.gobelet_hauteur_mm);
  if (diametre > 0 && hauteur > 0) {
    return { w: Math.round(Math.PI * diametre), h: hauteur };
  }
  const ml = parseDim(config.contenance_ml);
  if (ml > 0) {
    const preset = Object.entries(GOBELET_GABARITS_MM).find(([key]) => {
      const m = key.match(/(\d+)\s*ml/);
      return m && parseInt(m[1], 10) === ml;
    });
    if (preset) return preset[1];
    const nearest = Object.entries(GOBELET_GABARITS_MM)
      .map(([key, gab]) => {
        const m = key.match(/(\d+)\s*ml/);
        return m ? { diff: Math.abs(parseInt(m[1], 10) - ml), gab } : null;
      })
      .filter((x): x is { diff: number; gab: { w: number; h: number } } => x != null)
      .sort((a, b) => a.diff - b.diff)[0];
    if (nearest) return nearest.gab;
  }
  return null;
}

function withChute(w: number, h: number): { brutW: number; brutH: number; surfaceMm2: number } {
  const brutW = w + 2 * PACKAGING_CHUTE_MM;
  const brutH = h + 2 * PACKAGING_CHUTE_MM;
  return { brutW, brutH, surfaceMm2: brutW * brutH };
}

function parseDoypackDims(config: Record<string, unknown>): { w: number; h: number } | null {
  const format = String(config.format ?? '');
  if (format === 'Format personnalisé') {
    const w = parseDim(config.custom_width);
    const h = parseDim(config.custom_height);
    if (w > 0 && h > 0) return { w, h };
    return null;
  }
  const m = format.match(/(\d+)\s*×\s*(\d+)/);
  if (!m) return null;
  return { w: parseInt(m[1], 10), h: parseInt(m[2], 10) };
}

function parseSacPreset(format: string): { L: number; P: number; H: number } | null {
  const m = format.match(/(\d+)×(\d+)×(\d+)/);
  if (!m) return null;
  return { L: parseInt(m[1], 10), P: parseInt(m[2], 10), H: parseInt(m[3], 10) };
}

function sacDeveloppe(
  typeSac: string,
  L: number,
  P: number,
  H: number,
): { devW: number; devH: number; rule: string } {
  const G = PACKAGING_GLUE_TAB_MM;
  const R = 30;
  const F = P + 20;
  const sansSoufflet =
    typeSac.includes('sans soufflet') || typeSac === 'Sac kraft naturel' || typeSac === 'Sac kraft blanc';
  const fondPlat = typeSac.includes('fond plat');

  if (sansSoufflet && P <= 0) {
    return {
      devW: 2 * L + G,
      devH: H + 20 + 20,
      rule: 'Sac sans soufflet — 2L+G × H+F+R',
    };
  }
  if (fondPlat) {
    return {
      devW: 2 * L + 2 * P + G,
      devH: H + P + 30 + R,
      rule: 'Sac fond plat — 2L+2P+G × H+F+R',
    };
  }
  return {
    devW: 2 * L + 2 * P + G,
    devH: H + F + R,
    rule: 'Sac soufflets — 2L+2P+G × H+F+R',
  };
}

export function calculateSacPaperSurface(config: Record<string, unknown>): PackagingSurfaceResult | null {
  const format = String(config.format ?? '');
  let L = parseDim(config.longueur);
  let P = parseDim(config.profondeur ?? config.largeur);
  let H = parseDim(config.hauteur);

  if (format !== 'Format personnalisé') {
    const preset = parseSacPreset(format);
    if (preset) {
      L = preset.L;
      P = preset.P;
      H = preset.H;
    }
  }

  if (L <= 0 || H <= 0) return null;
  if (P <= 0 && !String(config.type_sac ?? '').includes('sans soufflet')) {
    P = parseDim(config.largeur);
  }

  const typeSac = String(config.type_sac ?? 'Sac papier avec soufflets latéraux');
  const { devW, devH, rule } = sacDeveloppe(typeSac, L, P || 0, H);
  const printW = devW + 2 * PACKAGING_BLEED_MM;
  const printH = devH + 2 * PACKAGING_BLEED_MM;
  const { brutW, brutH, surfaceMm2 } = withChute(printW, printH);

  return toResult({
    structure: typeSac,
    L,
    H,
    P: P || 0,
    formatDeveloppe: fmt(devW, devH),
    formatBrut: fmt(brutW, brutH),
    devW,
    devH,
    brutW,
    brutH,
    surfaceMm2,
    margeSecurite: PACKAGING_CHUTE_MM,
    margeRule: `${rule} — chute +${PACKAGING_CHUTE_MM} mm/côté`,
  });
}

export function calculateGobeletSurface(config: Record<string, unknown>): PackagingSurfaceResult | null {
  const zoneMode = String(config.face ?? config.type_impression ?? '');
  const isPartielle = /partielle/i.test(zoneMode) && !/totale|full/i.test(zoneMode);
  const isTotale = /totale|full\s*wrap/i.test(zoneMode);

  let netW = 0;
  let netH = 0;
  let structure = String(config.type_gobelet ?? 'Gobelet');

  if (isPartielle) {
    netW = parseDim(config.zone_impression_longueur ?? config.longueur_zone);
    netH = parseDim(config.zone_impression_largeur ?? config.largeur_zone);
    structure = 'Impression partielle';
  } else if (isTotale) {
    const gab = resolveGobeletTotaleGabarit(config);
    if (!gab) return null;
    netW = gab.w;
    netH = gab.h;
    structure = 'Impression totale';
  } else {
    return null;
  }

  if (netW <= 0 || netH <= 0) return null;

  const printW = netW + 2 * PACKAGING_BLEED_MM;
  const printH = netH + 2 * PACKAGING_BLEED_MM;
  const { brutW, brutH, surfaceMm2 } = withChute(printW, printH);

  return toResult({
    structure,
    L: netW,
    H: netH,
    P: 0,
    formatDeveloppe: fmt(netW, netH),
    formatBrut: fmt(brutW, brutH),
    devW: netW,
    devH: netH,
    brutW,
    brutH,
    surfaceMm2,
    margeSecurite: PACKAGING_CHUTE_MM,
    margeRule: `Zone impression — chute +${PACKAGING_CHUTE_MM} mm/côté`,
  });
}

export function calculateDoypackSurface(config: Record<string, unknown>): PackagingSurfaceResult | null {
  const dims = parseDoypackDims(config);
  if (!dims) return null;

  const { w, h } = dims;
  const printW = w + 2 * PACKAGING_BLEED_MM;
  const printH = h + 2 * PACKAGING_BLEED_MM;
  const { brutW, brutH, surfaceMm2 } = withChute(printW, printH);

  return toResult({
    structure: `Doypack ${String(config.matiere ?? '')}`.trim(),
    L: w,
    H: h,
    P: parseDim(config.custom_gusset),
    formatDeveloppe: fmt(w, h),
    formatBrut: fmt(brutW, brutH),
    devW: w,
    devH: h,
    brutW,
    brutH,
    surfaceMm2,
    margeSecurite: PACKAGING_CHUTE_MM,
    margeRule: `Face imprimable — chute +${PACKAGING_CHUTE_MM} mm/côté`,
  });
}

/** Surface L×l pour format personnalisé (étiquette, autocollants, etc.) */
export function calculateCustomLxLSurface(config: Record<string, unknown>): PackagingSurfaceResult | null {
  const custom = calculateCustomDimensionsSurface(config);
  if (!custom) return null;

  const chuteW = custom.longueurMm + custom.margeChuteMm * 2;
  const chuteH = custom.largeurMm + custom.margeChuteMm * 2;
  const surfaceMm2 = chuteW * chuteH;

  return toResult({
    structure: 'Format personnalisé',
    L: custom.longueurMm,
    H: custom.largeurMm,
    P: 0,
    formatDeveloppe: fmt(custom.longueurMm, custom.largeurMm),
    formatBrut: fmt(chuteW, chuteH),
    devW: custom.longueurMm,
    devH: custom.largeurMm,
    brutW: chuteW,
    brutH: chuteH,
    surfaceMm2,
    margeSecurite: custom.margeChuteMm,
    margeRule: `Surface nette L×l — brute +${BOX_ADMIN_DEFAULTS.surface_brute_extra_mm} mm — chute +${custom.margeChuteMm} mm/côté`,
  });
}

/** Récap matière brute unifié POS packaging */
export function resolvePackagingMaterialRecap(
  articleId: string,
  config: Record<string, unknown>,
): PackagingSurfaceResult | null {
  switch (articleId) {
    case 'pkg-boite':
      return calculateBoxPackaging(config);
    case 'pkg-sac':
      return calculateSacPaperSurface(config);
    case 'pkg-gobelet':
      return calculateGobeletSurface(config);
    case 'pkg-doypack':
      return calculateDoypackSurface(config);
    case 'pkg-etiquette':
      return calculateCustomLxLSurface(config);
    default:
      if (articleId.includes('boite')) return calculateBoxPackaging(config);
      return null;
  }
}
