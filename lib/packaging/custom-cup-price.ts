/**
 * Moteur Gobelet personnalisé (pkg-gobelet) — même logique que Doypack.
 */
import {
  applyMinSurfaceAndPrice,
  calculatePrintAreaM2,
  getVinylM2Price,
  resolveDecoupeVinylM2,
  resolvePosePetitPiece,
} from '@/lib/packaging/packaging-soft-shared';

export type CupBlankDefault = {
  typeGobelet: string;
  matiere?: string;
  contenance?: string;
  couleur?: string;
  diametreHautMm?: number;
  hauteurMm?: number;
  prixViergeHt: number;
};

const DEFAULT_CUPS: CupBlankDefault[] = [
  { typeGobelet: 'Gobelet carton', contenance: '8 oz (240 ml)', couleur: 'Blanc', prixViergeHt: 1000 },
  { typeGobelet: 'Gobelet carton', contenance: '12 oz (350 ml)', couleur: 'Blanc', prixViergeHt: 1200 },
  { typeGobelet: 'Gobelet kraft', contenance: '8 oz (240 ml)', couleur: 'Kraft', prixViergeHt: 1100 },
  { typeGobelet: 'Gobelet plastique', contenance: '8 oz (240 ml)', couleur: 'Transparent', prixViergeHt: 900 },
  { typeGobelet: 'Gobelet réutilisable', contenance: '12 oz (350 ml)', couleur: 'Blanc', prixViergeHt: 3500 },
];

let cups = DEFAULT_CUPS;
let laborDefault = 0;

export function setCupRuntime(list: CupBlankDefault[], labor = 0) {
  if (list.length) cups = list;
  laborDefault = labor;
}

export function getDefaultCupBlanks(): CupBlankDefault[] {
  return DEFAULT_CUPS;
}

function findCup(type: string, contenance: string): CupBlankDefault | null {
  const t = String(type ?? '').toLowerCase();
  const c = String(contenance ?? '').toLowerCase();
  return (
    cups.find((x) => x.typeGobelet.toLowerCase() === t && String(x.contenance ?? '').toLowerCase() === c)
    ?? cups.find((x) => x.typeGobelet.toLowerCase() === t)
    ?? null
  );
}

/** Gabarit impression totale approximatif depuis contenance (mm) */
function defaultCupFaceMm(contenance: string): { w: number; h: number } {
  if (/16\s*oz|475/.test(contenance)) return { w: 90, h: 120 };
  if (/12\s*oz|350/.test(contenance)) return { w: 80, h: 110 };
  if (/10\s*oz|300/.test(contenance)) return { w: 75, h: 100 };
  if (/6\s*oz|180/.test(contenance)) return { w: 65, h: 80 };
  if (/4\s*oz|120/.test(contenance)) return { w: 55, h: 70 };
  return { w: 70, h: 90 }; // 8 oz
}

export type CustomCupPriceInput = {
  typeGobelet?: string;
  contenance?: string;
  couleur?: string;
  zoneImpression?: string;
  printWidthMm?: number;
  printHeightMm?: number;
  technique?: string;
  matiereImpression?: string;
  decoupe?: boolean | string;
  pose?: boolean | string;
  labor?: boolean | string;
  qty?: number;
  prixViergeHt?: number;
  prixVinylM2?: number;
  prixDecoupeM2?: number;
  prixPosePiece?: number;
  prixLaborPiece?: number;
  /** Technique pièce (sublimation / sérigraphie) */
  prixTechniquePiece?: number;
};

export type CustomCupPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  reason?: string;
  typeGobelet: string;
  contenance: string;
  prixViergeHt: number;
  zoneLabel: string;
  surfaceImpressionM2: number;
  prixImpression: number;
  prixDecoupe: number;
  prixPose: number;
  prixLabor: number;
  prixUnitaire: number;
  qty: number;
  prixTotal: number;
  formula: string;
};

function yes(v: unknown, d = true): boolean {
  if (v == null || v === '') return d;
  if (typeof v === 'boolean') return v;
  return !/sans|non|0|false|off/i.test(String(v));
}

export function calculateCustomCupPrice(input: CustomCupPriceInput): CustomCupPriceResult {
  const qty = Math.max(1, Math.round(Number(input.qty) || 1));
  const typeGobelet = String(input.typeGobelet ?? 'Gobelet carton').trim();
  const contenance = String(input.contenance ?? '8 oz (240 ml)').trim();
  const blank = findCup(typeGobelet, contenance);
  const prixViergeHt =
    input.prixViergeHt != null && input.prixViergeHt > 0
      ? Math.round(input.prixViergeHt)
      : Math.round(blank?.prixViergeHt ?? 0);

  const empty = (reason: string): CustomCupPriceResult => ({
    calculable: false,
    surDevis: true,
    reason,
    typeGobelet,
    contenance,
    prixViergeHt,
    zoneLabel: '—',
    surfaceImpressionM2: 0,
    prixImpression: 0,
    prixDecoupe: 0,
    prixPose: 0,
    prixLabor: 0,
    prixUnitaire: 0,
    qty,
    prixTotal: 0,
    formula: '',
  });

  if (!(prixViergeHt > 0)) return empty('Gobelet vierge sans prix Admin');

  const face = defaultCupFaceMm(contenance);
  const zoneRaw = String(input.zoneImpression ?? 'Impression partielle');
  const area = calculatePrintAreaM2({
    bagWidthMm: face.w,
    bagHeightMm: face.h,
    zone: zoneRaw,
    printWidthMm: input.printWidthMm,
    printHeightMm: input.printHeightMm,
  });

  const tech = String(input.technique ?? 'Sticker / vinyle').toLowerCase();
  let prixImpression = 0;
  let prixDecoupe = 0;
  let prixPose = 0;

  if (area.surfaceM2 > 0 && !/sans/i.test(zoneRaw)) {
    if (/sublim|s[eé]rigraph|direct/.test(tech)) {
      prixImpression = Math.round(input.prixTechniquePiece ?? 500);
    } else {
      const m2 = getVinylM2Price(input.matiereImpression ?? 'Vinyle blanc', input.prixVinylM2);
      prixImpression = applyMinSurfaceAndPrice(area.surfaceM2, m2).amount;
      if (yes(input.decoupe, true)) {
        prixDecoupe = applyMinSurfaceAndPrice(
          area.surfaceM2,
          resolveDecoupeVinylM2(input.prixDecoupeM2),
        ).amount;
      }
      if (yes(input.pose, true)) {
        prixPose = resolvePosePetitPiece(input.prixPosePiece);
      }
    }
  }

  const prixLabor = yes(input.labor, false)
    ? Math.round(input.prixLaborPiece ?? laborDefault)
    : 0;

  const prixUnitaire = prixViergeHt + prixImpression + prixDecoupe + prixPose + prixLabor;
  return {
    calculable: prixUnitaire > 0,
    surDevis: !(prixUnitaire > 0),
    typeGobelet,
    contenance,
    prixViergeHt,
    zoneLabel: area.label,
    surfaceImpressionM2: area.surfaceM2,
    prixImpression,
    prixDecoupe,
    prixPose,
    prixLabor,
    prixUnitaire,
    qty,
    prixTotal: prixUnitaire * qty,
    formula: `vierge ${prixViergeHt} + imp ${prixImpression} + découpe ${prixDecoupe} + pose ${prixPose}`,
  };
}

export function calculateCustomCupPriceFromConfig(
  config: Record<string, unknown>,
  qtyFallback = 1,
): CustomCupPriceResult {
  const qty = Math.max(1, Math.round(Number(config.qty ?? qtyFallback) || qtyFallback));
  let zone = String(config.zone_impression ?? config.face ?? 'Impression partielle');
  if (/^impression\s*totale$/i.test(zone)) zone = 'Impression totale face avant';
  if (/partielle/i.test(zone)) zone = 'Impression partielle personnalisée';
  if (/sticker|iquette/i.test(zone)) zone = 'Sticker / étiquette personnalisée';

  let printW = Number(config.zone_impression_longueur ?? config.print_width_mm) || 0;
  let printH = Number(config.zone_impression_largeur ?? config.print_height_mm) || 0;
  const logo = logoDefaultMm(String(config.zone_impression ?? ''));
  if (logo && !(printW > 0 && printH > 0)) {
    printW = logo.w;
    printH = logo.h;
    zone = 'Sticker / étiquette personnalisée';
  }

  return calculateCustomCupPrice({
    typeGobelet: String(config.type_gobelet ?? 'Gobelet carton'),
    contenance: String(config.contenance ?? '8 oz (240 ml)'),
    couleur: String(config.couleur ?? ''),
    zoneImpression: zone,
    printWidthMm: printW,
    printHeightMm: printH,
    technique: String(config.technique_impression ?? 'Sticker / vinyle'),
    matiereImpression: String(config.matiere_impression ?? 'Vinyle blanc'),
    decoupe: (config.decoupe as string | boolean | undefined) ?? true,
    pose: (config.pose as string | boolean | undefined) ?? true,
    labor: (config.main_oeuvre as string | boolean | undefined) ?? false,
    qty,
  });
}

function logoDefaultMm(zone: string): { w: number; h: number } | null {
  if (/logo\s*petit/i.test(zone)) return { w: 30, h: 30 };
  if (/logo\s*moyen/i.test(zone)) return { w: 50, h: 50 };
  if (/logo\s*grand/i.test(zone)) return { w: 80, h: 80 };
  return null;
}

export function isCustomCupPricingArticle(articleId: string): boolean {
  return articleId === 'pkg-gobelet';
}

export function customCupPriceSummaryNote(r: CustomCupPriceResult): string {
  if (!r.calculable) return r.reason ? `Gobelet — ${r.reason}` : 'Gobelet — prix en attente';
  return `Vierge ${r.prixViergeHt} · ${r.zoneLabel} · imp ${r.prixImpression} · pose ${r.prixPose}`;
}
