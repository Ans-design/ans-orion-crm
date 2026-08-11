/**
 * Moteur prix Doypack (pkg-doypack)
 * vierge + impression vinyle m² + découpe + pose (+ MO)
 */
import {
  applyMinSurfaceAndPrice,
  calculatePrintAreaM2,
  getVinylM2Price,
  parseDimPairMm,
  resolveDecoupeVinylM2,
  resolvePosePetitPiece,
  type PrintZoneKind,
} from '@/lib/packaging/packaging-soft-shared';

export type DoypackBlankDefault = {
  matiere: string;
  formatLabel: string;
  largeurMm: number;
  hauteurMm: number;
  souffletMm: number;
  contenance?: string;
  couleur?: string;
  typeFermeture?: string;
  fenetre?: boolean;
  prixViergeHt: number;
  visiblePos?: boolean;
  actif?: boolean;
};

export type DoypackRuntime = {
  blanks: DoypackBlankDefault[];
  printMinPrix: number;
  printMinSurfaceM2: number;
  posePrixPiece: number;
  laborPrixPiece: number;
  vinylM2ByLabel: Record<string, number>;
};

const DEFAULT_BLANKS: DoypackBlankDefault[] = [
  { matiere: 'Kraft', formatLabel: '100×150mm', largeurMm: 100, hauteurMm: 150, souffletMm: 30, contenance: '100 g', couleur: 'Naturel', typeFermeture: 'Zip', fenetre: false, prixViergeHt: 1000 },
  { matiere: 'Kraft', formatLabel: '90×140mm', largeurMm: 90, hauteurMm: 140, souffletMm: 25, contenance: '80 g', couleur: 'Naturel', typeFermeture: 'Zip', fenetre: false, prixViergeHt: 900 },
  { matiere: 'Kraft', formatLabel: '150×220mm', largeurMm: 150, hauteurMm: 220, souffletMm: 50, contenance: '500 g', couleur: 'Naturel', typeFermeture: 'Zip', fenetre: false, prixViergeHt: 1800 },
  { matiere: 'Alu', formatLabel: '100×150mm', largeurMm: 100, hauteurMm: 150, souffletMm: 30, contenance: '100 g', couleur: 'Argent', typeFermeture: 'Zip', fenetre: false, prixViergeHt: 1400 },
  { matiere: 'Alu', formatLabel: '120×200mm', largeurMm: 120, hauteurMm: 200, souffletMm: 40, contenance: '250 g', couleur: 'Argent', typeFermeture: 'Zip', fenetre: true, prixViergeHt: 2200 },
  { matiere: 'Aluminium', formatLabel: '120×200mm', largeurMm: 120, hauteurMm: 200, souffletMm: 40, contenance: '250 g', couleur: 'Argent', typeFermeture: 'Zip', fenetre: true, prixViergeHt: 2200 },
  { matiere: 'Plastique', formatLabel: '100×150mm', largeurMm: 100, hauteurMm: 150, souffletMm: 30, contenance: '100 g', couleur: 'Transparent', typeFermeture: 'Zip', fenetre: false, prixViergeHt: 1100 },
];

let runtime: DoypackRuntime = {
  blanks: DEFAULT_BLANKS,
  printMinPrix: 0,
  printMinSurfaceM2: 0,
  posePrixPiece: 0, // 0 = FinishingPrice pose petit
  laborPrixPiece: 0,
  vinylM2ByLabel: {},
};

export function setDoypackRuntime( partial: Partial<DoypackRuntime>) {
  runtime = { ...runtime, ...partial, blanks: partial.blanks ?? runtime.blanks };
}

export function getDoypackRuntime(): DoypackRuntime {
  return runtime;
}

export function getDefaultDoypackBlanks(): DoypackBlankDefault[] {
  return DEFAULT_BLANKS;
}

export function formatsForDoypackMatiere(matiere: string): string[] {
  const m = String(matiere ?? '').trim().toLowerCase();
  const labels = runtime.blanks
    .filter((b) => b.actif !== false && b.visiblePos !== false)
    .filter((b) => {
      const bm = b.matiere.toLowerCase();
      if (m === 'alu' || m === 'aluminium') return bm === 'alu' || bm === 'aluminium';
      return bm === m;
    })
    .map((b) => b.formatLabel);
  return [...new Set(labels)];
}

export function findDoypackBlank(matiere: string, formatLabel: string): DoypackBlankDefault | null {
  const m = String(matiere ?? '').trim().toLowerCase();
  const f = String(formatLabel ?? '').replace(/\s+/g, '').toLowerCase();
  return (
    runtime.blanks.find((b) => {
      const bm = b.matiere.toLowerCase();
      const matOk =
        m === 'alu' || m === 'aluminium'
          ? bm === 'alu' || bm === 'aluminium'
          : bm === m;
      const bf = b.formatLabel.replace(/\s+/g, '').toLowerCase();
      return matOk && (bf === f || bf.includes(f) || f.includes(bf));
    }) ?? null
  );
}

export type DoypackPriceInput = {
  matiere?: string;
  format?: string;
  largeurMm?: number;
  hauteurMm?: number;
  souffletMm?: number;
  couleur?: string;
  fermeture?: string;
  fenetre?: boolean | string;
  zoneImpression?: string;
  printWidthMm?: number;
  printHeightMm?: number;
  matiereImpression?: string;
  decoupe?: boolean | string;
  pose?: boolean | string;
  labor?: boolean | string;
  qty?: number;
  /** Overrides tests / Admin */
  prixViergeHt?: number;
  prixVinylM2?: number;
  prixDecoupeM2?: number;
  prixPosePiece?: number;
  prixLaborPiece?: number;
};

export type DoypackPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  reason?: string;
  matiere: string;
  formatLabel: string;
  largeurMm: number;
  hauteurMm: number;
  prixViergeHt: number;
  zoneLabel: string;
  surfaceImpressionM2: number;
  prixVinylM2: number;
  prixImpression: number;
  prixDecoupe: number;
  prixPose: number;
  prixLabor: number;
  prixUnitaire: number;
  qty: number;
  prixTotal: number;
  formula: string;
};

function yes(v: unknown, defaultYes = true): boolean {
  if (v == null || v === '') return defaultYes;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (/sans|non|0|false|off|no/.test(s)) return false;
  return true;
}

export function calculateDoypackPrintArea(input: {
  format?: string;
  largeurMm?: number;
  hauteurMm?: number;
  zoneImpression?: string;
  printWidthMm?: number;
  printHeightMm?: number;
}): ReturnType<typeof calculatePrintAreaM2> & { bagW: number; bagH: number } {
  let bagW = Number(input.largeurMm) || 0;
  let bagH = Number(input.hauteurMm) || 0;
  if (!(bagW > 0 && bagH > 0)) {
    const parsed = parseDimPairMm(input.format);
    if (parsed) {
      bagW = parsed.w;
      bagH = parsed.h;
    }
  }
  const area = calculatePrintAreaM2({
    bagWidthMm: bagW,
    bagHeightMm: bagH,
    zone: input.zoneImpression ?? 'Sans impression',
    printWidthMm: input.printWidthMm,
    printHeightMm: input.printHeightMm,
  });
  return { ...area, bagW, bagH };
}

export function calculateDoypackPrice(input: DoypackPriceInput): DoypackPriceResult {
  const qty = Math.max(1, Math.round(Number(input.qty) || 1));
  const matiere = String(input.matiere ?? 'Kraft').trim();
  const formatLabel = String(input.format ?? '').trim();
  const blank = findDoypackBlank(matiere, formatLabel);

  let largeurMm = Number(input.largeurMm) || blank?.largeurMm || 0;
  let hauteurMm = Number(input.hauteurMm) || blank?.hauteurMm || 0;
  if (!(largeurMm > 0 && hauteurMm > 0)) {
    const p = parseDimPairMm(formatLabel);
    if (p) {
      largeurMm = p.w;
      hauteurMm = p.h;
    }
  }

  const prixViergeHt =
    input.prixViergeHt != null && input.prixViergeHt > 0
      ? Math.round(input.prixViergeHt)
      : Math.round(blank?.prixViergeHt ?? 0);

  const empty = (reason: string): DoypackPriceResult => ({
    calculable: false,
    surDevis: true,
    reason,
    matiere,
    formatLabel: formatLabel || '—',
    largeurMm,
    hauteurMm,
    prixViergeHt,
    zoneLabel: '—',
    surfaceImpressionM2: 0,
    prixVinylM2: 0,
    prixImpression: 0,
    prixDecoupe: 0,
    prixPose: 0,
    prixLabor: 0,
    prixUnitaire: 0,
    qty,
    prixTotal: 0,
    formula: '',
  });

  if (!(prixViergeHt > 0)) {
    return empty('Doypack vierge sans prix Admin (matière/format)');
  }
  if (!(largeurMm > 0 && hauteurMm > 0) && !/personnalis/i.test(formatLabel)) {
    return empty('Format doypack sans dimensions');
  }

  const area = calculateDoypackPrintArea({
    format: formatLabel,
    largeurMm,
    hauteurMm,
    zoneImpression: input.zoneImpression,
    printWidthMm: input.printWidthMm,
    printHeightMm: input.printHeightMm,
  });

  const zoneKind = area.faces === 0 ? ('sans' as PrintZoneKind) : normalizeFromLabel(area.label);
  const hasPrint = area.surfaceM2 > 0 && zoneKind !== 'sans';

  let prixVinylM2 = 0;
  let prixImpression = 0;
  let prixDecoupe = 0;
  let prixPose = 0;

  if (hasPrint) {
    const matImp = String(input.matiereImpression ?? 'Vinyle blanc').trim();
    prixVinylM2 = getVinylM2Price(matImp, input.prixVinylM2 ?? runtime.vinylM2ByLabel[matImp]);
    const printed = applyMinSurfaceAndPrice(area.surfaceM2, prixVinylM2, {
      surfaceMinimumM2: runtime.printMinSurfaceM2,
      prixMinimum: runtime.printMinPrix,
    });
    prixImpression = printed.amount;

    if (yes(input.decoupe, true)) {
      const dM2 = resolveDecoupeVinylM2(input.prixDecoupeM2);
      const cut = applyMinSurfaceAndPrice(area.surfaceM2, dM2, {
        surfaceMinimumM2: runtime.printMinSurfaceM2,
      });
      prixDecoupe = cut.amount;
    }
    if (yes(input.pose, true)) {
      prixPose = resolvePosePetitPiece(
        input.prixPosePiece ?? (runtime.posePrixPiece > 0 ? runtime.posePrixPiece : undefined),
      );
    }
  }

  const prixLabor = yes(input.labor, false)
    ? Math.round(input.prixLaborPiece ?? runtime.laborPrixPiece ?? 0)
    : 0;

  const prixUnitaire = prixViergeHt + prixImpression + prixDecoupe + prixPose + prixLabor;
  return {
    calculable: prixUnitaire > 0,
    surDevis: !(prixUnitaire > 0),
    matiere,
    formatLabel: formatLabel || `${largeurMm}×${hauteurMm}mm`,
    largeurMm,
    hauteurMm,
    prixViergeHt,
    zoneLabel: area.label,
    surfaceImpressionM2: area.surfaceM2,
    prixVinylM2,
    prixImpression,
    prixDecoupe,
    prixPose,
    prixLabor,
    prixUnitaire,
    qty,
    prixTotal: prixUnitaire * qty,
    formula:
      `vierge ${prixViergeHt}`
      + ` + vinyle ${prixImpression}`
      + ` + découpe ${prixDecoupe}`
      + ` + pose ${prixPose}`
      + (prixLabor ? ` + MO ${prixLabor}` : ''),
  };
}

function normalizeFromLabel(label: string): PrintZoneKind {
  if (/sans/i.test(label)) return 'sans';
  if (/sticker/i.test(label)) return 'sticker';
  if (/personnalis/i.test(label)) return 'partielle';
  if (/recto-verso|recto\/verso/i.test(label)) return 'recto_verso';
  return 'totale_avant';
}

export function calculateDoypackPriceFromConfig(
  config: Record<string, unknown>,
  qtyFallback = 1,
): DoypackPriceResult {
  const qty = Math.max(1, Math.round(Number(config.qty ?? config.quantite ?? qtyFallback) || qtyFallback));
  const format = String(config.format ?? '');
  let largeurMm = Number(config.custom_width ?? config.largeurMm ?? config.longueur) || 0;
  let hauteurMm = Number(config.custom_height ?? config.hauteurMm ?? config.hauteur) || 0;
  const zone = String(config.zone_impression ?? config.face ?? 'Sans impression');
  // Compat ancienne config face Recto → traiter comme impression totale si zone manquante
  let zoneImpression = zone;
  if (/^recto$/i.test(zone)) zoneImpression = 'Impression totale face avant';
  if (/recto[\s-]*verso/i.test(zone) && !/zone|partiel|sticker/i.test(zone)) {
    zoneImpression = 'Impression recto-verso';
  }

  return calculateDoypackPrice({
    matiere: String(config.matiere ?? 'Kraft'),
    format,
    largeurMm,
    hauteurMm,
    souffletMm: Number(config.custom_gusset) || 0,
    couleur: String(config.couleur_doypack ?? config.couleur ?? ''),
    fermeture: String(config.fermeture ?? config.type_fermeture ?? 'Zip'),
    fenetre: config.fenetre as string | boolean | undefined,
    zoneImpression,
    printWidthMm: Number(config.zone_impression_largeur ?? config.print_width_mm) || 0,
    printHeightMm: Number(config.zone_impression_hauteur ?? config.print_height_mm) || 0,
    matiereImpression: String(config.matiere_impression ?? config.matiere_vinyle ?? 'Vinyle blanc'),
    decoupe: (config.decoupe as string | boolean | undefined) ?? true,
    pose: (config.pose as string | boolean | undefined) ?? true,
    labor: (config.main_oeuvre as string | boolean | undefined) ?? false,
    qty,
  });
}

export function isDoypackPricingArticle(articleId: string): boolean {
  return articleId === 'pkg-doypack';
}

export function doypackPriceSummaryNote(r: DoypackPriceResult): string {
  if (!r.calculable) return r.reason ? `Doypack — ${r.reason}` : 'Doypack — prix en attente';
  return (
    `Vierge ${r.prixViergeHt} Ar`
    + ` · ${r.zoneLabel}`
    + (r.surfaceImpressionM2 > 0 ? ` (${(r.surfaceImpressionM2 * 1e4).toFixed(1)} cm²)` : '')
    + ` · imp. ${r.prixImpression} · découpe ${r.prixDecoupe} · pose ${r.prixPose}`
  );
}
