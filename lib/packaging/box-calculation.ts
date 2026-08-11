/**
 * Calcul boîte personnalisée — développé, marges, formats internationaux, poses.
 * Formules alignées sur data/reference/prompts-pos-packaging/boite/
 */
import { resolveBoxMaterialEpaisseurMm } from '@/lib/packaging/box-admin-defaults';
import {
  PACKAGING_BLEED_MM,
  PACKAGING_CHUTE_MM,
  PACKAGING_GLUE_TAB_MM,
} from '@/lib/packaging/material-recap';

export type BoxStructureKey =
  | 'straight_tuck'
  | 'reverse_tuck'
  | 'auto_bottom'
  | 'snap_lock'
  | 'sleeve'
  | 'drawer_set'
  | 'lid_base'
  | 'tray'
  | 'pillow'
  | 'legacy_expedition'
  | 'legacy_other';

export type BoxSheetFormat = { id: string; w: number; h: number };

export const BOX_SHEET_FORMATS: BoxSheetFormat[] = [
  { id: 'A4', w: 210, h: 297 },
  { id: 'A3', w: 297, h: 420 },
  { id: 'A2', w: 420, h: 594 },
  { id: 'A1', w: 594, h: 841 },
  { id: 'A0', w: 841, h: 1189 },
  { id: '2A0', w: 1189, h: 1682 },
  { id: '4A0', w: 1682, h: 2378 },
];

export type BoxPartResult = {
  name: string;
  devW: number;
  devH: number;
  printW: number;
  printH: number;
  brutW: number;
  brutH: number;
  surfaceBruteM2: number;
  formatInternational: string;
  posesPerSheet: number;
  surfaceFactureeM2: number;
  tauxChutePct: number;
};

export type BoxCalculationResult = {
  structure: string;
  structureKey: BoxStructureKey;
  L: number;
  H: number;
  P: number;
  devW: number;
  devH: number;
  brutW: number;
  brutH: number;
  formatDeveloppe: string;
  formatBrut: string;
  surfaceMm2: number;
  surfaceCm2: number;
  surfaceM2: number;
  margeSecurite: number;
  margeRule: string;
  bleedMm: number;
  glueTabMm: number;
  grammage: number;
  epaisseurMm: number;
  formatInternational: string;
  posesPerSheet: number;
  surfaceFactureeM2: number;
  tauxChutePct: number;
  poidsMatiereG: number;
  parts?: BoxPartResult[];
  alert?: string;
  rabatAimante?: number;
  charniereDos?: number;
};

function parseDim(val: unknown): number {
  if (val === '' || val === undefined || val === null) return 0;
  const n = parseFloat(String(val));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function fmt(w: number, h: number): string {
  return `${Math.round(w)} × ${Math.round(h)} mm`;
}

export function parseGrammageFromConfig(config: Record<string, unknown>): number {
  const g = String(config.grammage ?? '');
  const m = g.match(/(\d+)\s*g/i);
  if (m) return parseInt(m[1], 10);
  const n = parseDim(config.grammage);
  return n > 50 ? n : 350;
}

export function estimatedThicknessMm(grammage: number): number {
  if (grammage >= 400) return 0.53;
  if (grammage >= 350) return 0.475;
  if (grammage >= 300) return 0.4;
  return 0.35;
}

export function normalizeBoxStructure(raw: string): { key: BoxStructureKey; label: string } {
  const s = raw.trim();
  const map: Record<string, BoxStructureKey> = {
    'Boîte rabats droits': 'straight_tuck',
    'Straight Tuck End': 'straight_tuck',
    'Boîte rabats inversés': 'reverse_tuck',
    'Reverse Tuck End': 'reverse_tuck',
    'Boîte fond automatique': 'auto_bottom',
    'Auto Bottom': 'auto_bottom',
    'Boîte fond 1-2-3': 'snap_lock',
    'Snap Lock': 'snap_lock',
    Fourreau: 'sleeve',
    Sleeve: 'sleeve',
    'Boîte tiroir': 'drawer_set',
    Tiroir: 'drawer_set',
    'Boîte fond + couvercle': 'lid_base',
    'Fond + couvercle': 'lid_base',
    'Plateau ouvert': 'tray',
    Tray: 'tray',
    'Boîte oreiller': 'pillow',
    'Pillow Box': 'pillow',
    Expédition: 'legacy_expedition',
    'Caisse US': 'legacy_expedition',
    Cloche: 'legacy_other',
    Allumette: 'legacy_other',
    Aimantée: 'legacy_other',
    'Fond auto': 'auto_bottom',
    'Fond à coller': 'snap_lock',
    'Sur mesure': 'straight_tuck',
    'Boîte simple': 'straight_tuck',
    'Boîte personnalisée': 'straight_tuck',
    'Boîte avec couvercle': 'lid_base',
    'Boîte cloche': 'legacy_other',
    'Boîte fourreau': 'sleeve',
  };
  const key = map[s] ?? 'legacy_other';
  return { key, label: s || 'Boîte rabats droits' };
}

function tuckFlaps(P: number): { T: number; D: number } {
  return { T: Math.max(15, P / 2 - 5), D: Math.max(10, P / 2 - 2) };
}

function netDeveloped(
  key: BoxStructureKey,
  L: number,
  P: number,
  H: number,
  config: Record<string, unknown>,
): { devW: number; devH: number; surfaceFactor?: number; alert?: string } {
  const G = parseDim(config.patte_colle) || PACKAGING_GLUE_TAB_MM;
  const { T, D } = tuckFlaps(P);

  switch (key) {
    case 'straight_tuck':
    case 'reverse_tuck':
      return { devW: 2 * L + 2 * P + G, devH: H + 2 * Math.max(T, D) };
    case 'auto_bottom': {
      const AB = P + 15;
      return { devW: 2 * L + 2 * P + G, devH: H + T + AB, alert: 'Fond automatique : collage obligatoire, façonnage plus coûteux.' };
    }
    case 'snap_lock': {
      const SL = P + 10;
      const alert = L > 2 * P || P > 2 * L ? 'Proportion déséquilibrée : fond 1-2-3 à vérifier, renfort conseillé.' : undefined;
      return { devW: 2 * L + 2 * P + G, devH: H + T + SL, alert };
    }
    case 'sleeve':
      return { devW: 2 * P + 2 * H + G, devH: L };
    case 'tray':
      return { devW: L + 2 * H, devH: P + 2 * H };
    case 'pillow':
      return {
        devW: 2 * L + G,
        devH: P + 2 * H,
        surfaceFactor: 1.15,
        alert: 'Boîte oreiller : estimation — gabarit à valider avant production.',
      };
    case 'legacy_expedition':
      return { devW: L + 2 * P + G, devH: 2 * H + 2 * P + G };
    case 'legacy_other':
    default:
      return { devW: 2 * L + 2 * P + G, devH: H + 2 * P + G };
  }
}

export function resolveSheetFormat(brutW: number, brutH: number): {
  format: BoxSheetFormat | null;
  label: string;
  poses: number;
  surfaceFactureeM2: number;
  tauxChutePct: number;
} {
  let best: BoxSheetFormat | null = null;
  let bestPoses = 0;
  let bestArea = Infinity;

  for (const f of BOX_SHEET_FORMATS) {
    for (const [fw, fh] of [
      [f.w, f.h],
      [f.h, f.w],
    ] as const) {
      if (brutW > fw || brutH > fh) continue;
      const p1 = Math.floor(fw / brutW) * Math.floor(fh / brutH);
      const p2 = Math.floor(fw / brutH) * Math.floor(fh / brutW);
      const poses = Math.max(p1, p2);
      if (poses <= 0) continue;
      const area = fw * fh;
      if (poses > bestPoses || (poses === bestPoses && area < bestArea)) {
        best = f;
        bestPoses = poses;
        bestArea = area;
      }
    }
  }

  if (!best || bestPoses <= 0) {
    return {
      format: null,
      label: 'Format personnalisé / grand format',
      poses: 1,
      surfaceFactureeM2: (brutW * brutH) / 1_000_000,
      tauxChutePct: 0,
    };
  }

  const sheetM2 = (best.w * best.h) / 1_000_000;
  const unitBruteM2 = (brutW * brutH) / 1_000_000;
  const surfaceFactureeM2 = sheetM2 / bestPoses;
  const tauxChutePct = Math.max(0, (1 - (bestPoses * unitBruteM2) / sheetM2) * 100);

  return {
    format: best,
    label: best.id,
    poses: bestPoses,
    surfaceFactureeM2: parseFloat(surfaceFactureeM2.toFixed(6)),
    tauxChutePct: parseFloat(tauxChutePct.toFixed(2)),
  };
}

function finalizePart(
  name: string,
  devW: number,
  devH: number,
  bleed: number,
  chute: number,
  surfaceFactor = 1,
): BoxPartResult {
  const printW = devW + 2 * bleed;
  const printH = devH + 2 * bleed;
  const brutW = printW + 2 * chute;
  const brutH = printH + 2 * chute;
  let surfaceBruteM2 = (brutW * brutH) / 1_000_000;
  if (surfaceFactor !== 1) surfaceBruteM2 *= surfaceFactor;
  const sheet = resolveSheetFormat(brutW, brutH);
  return {
    name,
    devW: Math.round(devW),
    devH: Math.round(devH),
    printW: Math.round(printW),
    printH: Math.round(printH),
    brutW: Math.round(brutW),
    brutH: Math.round(brutH),
    surfaceBruteM2: parseFloat(surfaceBruteM2.toFixed(6)),
    formatInternational: sheet.label,
    posesPerSheet: sheet.poses,
    surfaceFactureeM2: sheet.surfaceFactureeM2,
    tauxChutePct: sheet.tauxChutePct,
  };
}

function drawerParts(L: number, P: number, H: number, config: Record<string, unknown>): BoxPartResult[] {
  const G = parseDim(config.patte_colle) || PACKAGING_GLUE_TAB_MM;
  const bleed = parseDim(config.bleed) || PACKAGING_BLEED_MM;
  const chute = parseDim(config.marge_chute) || PACKAGING_CHUTE_MM;
  return [
    finalizePart('Fourreau', 2 * P + 2 * H + G, L, bleed, chute),
    finalizePart('Tiroir', L + 2 * H, P + 2 * H, bleed, chute),
  ];
}

function lidBaseParts(L: number, P: number, H: number, config: Record<string, unknown>): BoxPartResult[] {
  const jeu = parseDim(config.jeu_couvercle) || 2;
  const Hc = parseDim(config.hauteur_couvercle) || H;
  const bleed = parseDim(config.bleed) || PACKAGING_BLEED_MM;
  const chute = parseDim(config.marge_chute) || PACKAGING_CHUTE_MM;
  const cL = L + 2 * jeu;
  const cP = P + 2 * jeu;
  return [
    finalizePart('Base', L + 2 * H, P + 2 * H, bleed, chute),
    finalizePart('Couvercle', cL + 2 * Hc, cP + 2 * Hc, bleed, chute),
  ];
}

/** Calcul complet boîte personnalisée */
export function calculateBoxPackaging(config: Record<string, unknown>): BoxCalculationResult | null {
  const L = parseDim(config.longueur);
  const H = parseDim(config.hauteur);
  const P = parseDim(config.profondeur);
  if (L <= 0 || H <= 0 || P <= 0) return null;

  const { key, label } = normalizeBoxStructure(String(config.structure ?? ''));
  const bleed = parseDim(config.bleed) || PACKAGING_BLEED_MM;
  const chute = parseDim(config.marge_chute) || PACKAGING_CHUTE_MM;
  const glueTab = parseDim(config.patte_colle) || PACKAGING_GLUE_TAB_MM;
  const grammage = parseGrammageFromConfig(config);
  const matiereLabel = String(config.matiere ?? config.matiere_boite ?? '');
  const epaisseurMm = matiereLabel
    ? resolveBoxMaterialEpaisseurMm(matiereLabel)
    : estimatedThicknessMm(grammage);

  let parts: BoxPartResult[] | undefined;
  let alert: string | undefined;

  if (key === 'drawer_set') {
    parts = drawerParts(L, P, H, config);
  } else if (key === 'lid_base') {
    parts = lidBaseParts(L, P, H, config);
  } else {
    const net = netDeveloped(key, L, P, H, config);
    alert = net.alert;
    parts = [
      finalizePart(label, net.devW, net.devH, bleed, chute, net.surfaceFactor ?? 1),
    ];
  }

  const totalBruteM2 = parts.reduce((s, p) => s + p.surfaceBruteM2, 0);
  const totalFactureeM2 = parts.reduce((s, p) => s + p.surfaceFactureeM2, 0);
  const poidsMatiereG = parseFloat((totalBruteM2 * grammage).toFixed(2));

  const primary = parts[0];
  const devW = parts.length === 1 ? primary.devW : parts.reduce((max, p) => Math.max(max, p.devW), 0);
  const devH = parts.length === 1 ? primary.devH : parts.reduce((sum, p) => sum + p.devH, 0);

  const surfaceMm2 = Math.round(totalBruteM2 * 1_000_000);
  const surfaceCm2 = Math.round(surfaceMm2 / 100);
  const surfaceM2 = parseFloat(totalBruteM2.toFixed(4));

  const avgTaux =
    parts.length > 0
      ? parseFloat((parts.reduce((s, p) => s + p.tauxChutePct, 0) / parts.length).toFixed(2))
      : 0;

  return {
    structure: label,
    structureKey: key,
    L,
    H,
    P,
    devW,
    devH,
    brutW: primary.brutW,
    brutH: primary.brutH,
    formatDeveloppe: parts.length === 1 ? fmt(primary.devW, primary.devH) : parts.map((p) => `${p.name}: ${fmt(p.devW, p.devH)}`).join(' · '),
    formatBrut: parts.length === 1 ? fmt(primary.brutW, primary.brutH) : parts.map((p) => `${p.name}: ${fmt(p.brutW, p.brutH)}`).join(' · '),
    surfaceMm2,
    surfaceCm2,
    surfaceM2,
    margeSecurite: chute,
    margeRule: `Bleed ${bleed} mm — chute +${chute} mm/côté (+100 mm L×H)`,
    bleedMm: bleed,
    glueTabMm: glueTab,
    grammage,
    epaisseurMm,
    formatInternational: parts.map((p) => `${p.name}: ${p.formatInternational}`).join(' · '),
    posesPerSheet: Math.min(...parts.map((p) => p.posesPerSheet)),
    surfaceFactureeM2: parseFloat(totalFactureeM2.toFixed(6)),
    tauxChutePct: avgTaux,
    poidsMatiereG,
    parts: parts.length > 1 ? parts : undefined,
    alert,
  };
}
