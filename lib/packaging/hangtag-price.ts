/**
 * Moteur Hangtag (pkg-hangtag) — ISF feuille / pièces + finitions + accessoires.
 */
import { calculatePiecesPerSheet, parseCardDimensionsMm } from '@/lib/pricing/carterie-imposition';
import {
  resolveImpressionSfPaperPriceKey,
} from '@/lib/pricing/impression-sf-pricing';
import { IMPRESSION_SF_PAPER_TARIFFS } from '@/lib/data/impression-sf-paper-tariffs';
import { pickTierUnitPrice } from '@/lib/pricing/tier-price';
import { ansCalcRectoVersoPrice } from '@/lib/pricing/impression-sf-pricing';
import { isRectoVerso } from '@/lib/pricing/config-normalize';
import { getEffectiveFinitionBasePrices } from '@/lib/finition/finition-price-catalog';

export type HangtagImpositionDefault = {
  formatFini: string;
  largeurMm: number;
  hauteurMm: number;
  formatFeuilleBase: string;
  piecesParFeuille: number | null;
};

export type HangtagAccessoryDefault = {
  accessoire: string;
  prixHt: number;
};

const DEFAULT_IMPOSITIONS: HangtagImpositionDefault[] = [
  { formatFini: '85×55 mm', largeurMm: 85, hauteurMm: 55, formatFeuilleBase: 'A4', piecesParFeuille: 10 },
  { formatFini: '50×90 mm', largeurMm: 50, hauteurMm: 90, formatFeuilleBase: 'A4', piecesParFeuille: 12 },
  { formatFini: '55×85 mm', largeurMm: 55, hauteurMm: 85, formatFeuilleBase: 'A4', piecesParFeuille: 10 },
  { formatFini: '60×100 mm', largeurMm: 60, hauteurMm: 100, formatFeuilleBase: 'A4', piecesParFeuille: 8 },
  { formatFini: '70×120 mm', largeurMm: 70, hauteurMm: 120, formatFeuilleBase: 'A4', piecesParFeuille: 6 },
  { formatFini: '1/10 A4 (63×99mm)', largeurMm: 63, hauteurMm: 99, formatFeuilleBase: 'A4', piecesParFeuille: 10 },
  { formatFini: '1/12 A4 (63×82mm)', largeurMm: 63, hauteurMm: 82, formatFeuilleBase: 'A4', piecesParFeuille: 12 },
  { formatFini: '1/16 A4 (52×74mm)', largeurMm: 52, hauteurMm: 74, formatFeuilleBase: 'A4', piecesParFeuille: 16 },
  { formatFini: '1/20 A4 (42×63mm)', largeurMm: 42, hauteurMm: 63, formatFeuilleBase: 'A4', piecesParFeuille: 20 },
  { formatFini: '1/24 A4 (42×52mm)', largeurMm: 42, hauteurMm: 52, formatFeuilleBase: 'A4', piecesParFeuille: 24 },
];

const DEFAULT_ACCESSORIES: HangtagAccessoryDefault[] = [
  { accessoire: 'Cordelette', prixHt: 50 },
  { accessoire: 'Œillet', prixHt: 80 },
  { accessoire: 'Ruban', prixHt: 100 },
  { accessoire: 'Découpe spéciale', prixHt: 50 },
  { accessoire: 'Coins arrondis', prixHt: 30 },
  { accessoire: 'Perforation', prixHt: 20 },
];

let impositions = DEFAULT_IMPOSITIONS;
let accessories = DEFAULT_ACCESSORIES;

export function setHangtagRuntime(opts: {
  impositions?: HangtagImpositionDefault[];
  accessories?: HangtagAccessoryDefault[];
}) {
  if (opts.impositions?.length) impositions = opts.impositions;
  if (opts.accessories?.length) accessories = opts.accessories;
}

export function getDefaultHangtagImpositions() {
  return DEFAULT_IMPOSITIONS;
}
export function getDefaultHangtagAccessories() {
  return DEFAULT_ACCESSORIES;
}

function resolveDims(dimension: string, customW?: number, customH?: number) {
  if (customW && customH && customW > 0 && customH > 0) return { w: customW, h: customH };
  const rule = impositions.find((i) => i.formatFini === dimension);
  if (rule) return { w: rule.largeurMm, h: rule.hauteurMm, pieces: rule.piecesParFeuille };
  const parsed = parseCardDimensionsMm(dimension);
  if (parsed) return { w: parsed.w, h: parsed.h };
  return null;
}

function resolvePieces(dimension: string, w: number, h: number): number {
  const rule = impositions.find((i) => i.formatFini === dimension);
  if (rule?.piecesParFeuille && rule.piecesParFeuille > 0) return rule.piecesParFeuille;
  const m = String(dimension).match(/1\/(\d+)\s*A4/i);
  if (m) return parseInt(m[1]!, 10);
  const auto = calculatePiecesPerSheet({
    sheetFormat: rule?.formatFeuilleBase ?? 'A4',
    cardWidth: w,
    cardHeight: h,
    marginMm: 3,
    gapMm: 2,
    allowRotation: true,
  });
  return Math.max(1, auto.pieces || 1);
}

function sheetIsfPrice(matiere: string, grammage: string, qty: number, override?: number): number {
  if (override != null && override > 0) return Math.round(override);
  const key = resolveImpressionSfPaperPriceKey(matiere, grammage, 'Impression numérique couleur');
  if (!key) return 0;
  const entry = IMPRESSION_SF_PAPER_TARIFFS[key];
  if (!entry) return 0;
  return Math.round(pickTierUnitPrice(entry.tiers, Math.max(1, qty)));
}

function finitionsSheetAmount(labels: string[]): number {
  const P = getEffectiveFinitionBasePrices();
  let sum = 0;
  for (const raw of labels) {
    const s = raw.toLowerCase();
    if (/pellicul/.test(s)) sum += P.pelliculageA4Recto;
    else if (/gaufrage/.test(s)) sum += P.gaufrageA4;
    else if (/dorure/.test(s)) sum += P.dorureStandardA4;
    else if (/vernis/.test(s)) sum += P.vernisA4Recto;
  }
  return Math.round(sum);
}

function accessoryAmount(labels: string[]): { lines: Array<{ label: string; amount: number }>; total: number } {
  const lines: Array<{ label: string; amount: number }> = [];
  let total = 0;
  for (const raw of labels) {
    const hit = accessories.find((a) => a.accessoire.toLowerCase() === raw.toLowerCase())
      ?? accessories.find((a) => raw.toLowerCase().includes(a.accessoire.toLowerCase()));
    if (!hit) continue;
    lines.push({ label: hit.accessoire, amount: hit.prixHt });
    total += hit.prixHt;
  }
  return { lines, total: Math.round(total) };
}

export type HangtagPriceInput = {
  dimension?: string;
  largeurMm?: number;
  hauteurMm?: number;
  matiere?: string;
  grammage?: string;
  face?: string;
  finitions?: string[];
  particularites?: string[];
  qty?: number;
  prixFeuilleIsf?: number;
};

export type HangtagPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  reason?: string;
  dimension: string;
  largeurMm: number;
  hauteurMm: number;
  piecesParFeuille: number;
  prixImpressionFeuille: number;
  prixFinitionsFeuille: number;
  prixParPieceAvantAccessoires: number;
  accessoires: Array<{ label: string; amount: number }>;
  prixAccessoires: number;
  prixUnitaire: number;
  qty: number;
  prixTotal: number;
  formula: string;
};

export function calculateHangtagPrice(input: HangtagPriceInput): HangtagPriceResult {
  const qty = Math.max(1, Math.round(Number(input.qty) || 1));
  const dimension = String(input.dimension ?? '85×55 mm').trim();
  const dims = resolveDims(dimension, input.largeurMm, input.hauteurMm);

  const empty = (reason: string): HangtagPriceResult => ({
    calculable: false,
    surDevis: true,
    reason,
    dimension,
    largeurMm: 0,
    hauteurMm: 0,
    piecesParFeuille: 0,
    prixImpressionFeuille: 0,
    prixFinitionsFeuille: 0,
    prixParPieceAvantAccessoires: 0,
    accessoires: [],
    prixAccessoires: 0,
    prixUnitaire: 0,
    qty,
    prixTotal: 0,
    formula: '',
  });

  if (!dims) return empty('Format hangtag sans dimensions');

  const w = dims.w;
  const h = dims.h;
  const pieces = resolvePieces(dimension, w, h);
  if (!(pieces > 0)) return empty('Hangtag sans pièces par feuille');

  const matiere = String(input.matiere ?? 'PCB').trim();
  const grammage = String(input.grammage ?? '300g').trim();
  let prixFeuille = sheetIsfPrice(matiere, grammage, qty, input.prixFeuilleIsf);
  if (!(prixFeuille > 0)) return empty('Hangtag sans prix Impression sans finition');

  if (isRectoVerso(input.face)) {
    prixFeuille = ansCalcRectoVersoPrice(prixFeuille);
  }

  const fins = Array.isArray(input.finitions) ? input.finitions : [];
  const prixFinitionsFeuille = finitionsSheetAmount(fins);
  const perPiece = Math.round((prixFeuille + prixFinitionsFeuille) / pieces);
  const parts = Array.isArray(input.particularites) ? input.particularites : [];
  // Découpe droite papier par défaut si non listée
  const P = getEffectiveFinitionBasePrices();
  const acc = accessoryAmount(parts);
  let prixAccessoires = acc.total;
  const accessoires = [...acc.lines];
  if (!parts.some((p) => /d[eé]coupe/i.test(p))) {
    accessoires.push({ label: 'Découpe', amount: P.decoupeDroitePapier });
    prixAccessoires += P.decoupeDroitePapier;
  }

  const prixUnitaire = perPiece + prixAccessoires;
  return {
    calculable: prixUnitaire > 0,
    surDevis: !(prixUnitaire > 0),
    dimension,
    largeurMm: w,
    hauteurMm: h,
    piecesParFeuille: pieces,
    prixImpressionFeuille: prixFeuille,
    prixFinitionsFeuille,
    prixParPieceAvantAccessoires: perPiece,
    accessoires,
    prixAccessoires,
    prixUnitaire,
    qty,
    prixTotal: prixUnitaire * qty,
    formula: `(ISF ${prixFeuille}+fin ${prixFinitionsFeuille})/${pieces} + acc ${prixAccessoires}`,
  };
}

export function calculateHangtagPriceFromConfig(
  config: Record<string, unknown>,
  qtyFallback = 1,
): HangtagPriceResult {
  const qty = Math.max(1, Math.round(Number(config.qty ?? qtyFallback) || qtyFallback));
  const asList = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    return String(v ?? '')
      .split(/[,;|]/)
      .map((x) => x.trim())
      .filter(Boolean);
  };
  return calculateHangtagPrice({
    dimension: String(config.dimension ?? config.format ?? '85×55 mm'),
    largeurMm: Number(config.custom_width ?? config.longueur) || undefined,
    hauteurMm: Number(config.custom_height ?? config.hauteur) || undefined,
    matiere: String(config.matiere ?? 'PCB'),
    grammage: String(config.grammage ?? '300g'),
    face: String(config.face ?? 'Recto'),
    finitions: asList(config.finitions),
    particularites: asList(config.particularites),
    qty,
  });
}

export function isHangtagPricingArticle(articleId: string): boolean {
  return articleId === 'pkg-hangtag';
}

export function hangtagPriceSummaryNote(r: HangtagPriceResult): string {
  if (!r.calculable) return r.reason ? `Hangtag — ${r.reason}` : 'Hangtag — prix en attente';
  return (
    `${r.piecesParFeuille} p./feuille`
    + ` · pièce ${r.prixParPieceAvantAccessoires} Ar`
    + ` · acc. ${r.prixAccessoires} Ar`
  );
}
