/**
 * Règles Carterie — imposition + paramètres calcul (SystemConfig).
 * Ne duplique pas les grilles ISF ni Finitions : liens uniquement.
 */

import { FINITION_BASE_PRICES, getEffectiveFinitionBasePrices } from '@/lib/finition/finition-price-catalog';
import { calculatePiecesPerSheet, parseCardDimensionsMm } from '@/lib/pricing/carterie-imposition';

function isStrictCarterieRuntime(): boolean {
  if (process.env.STRICT_POS_PRICING === '1' || process.env.STRICT_POS_PRICING === 'true') return true;
  if (process.env.STRICT_POS_PRICING === '0' || process.env.STRICT_POS_PRICING === 'false') {
    return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  }
  return (
    process.env.NODE_ENV === 'production'
    || process.env.VERCEL_ENV === 'production'
    || process.env.HOSTINGER === 'true'
  );
}

export const CARTERIE_PRICING_RULES_CONFIG_KEY = 'carterie_pricing_rules';

export const CARTERIE_IMPOSITION_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'FORMAT FINI',
  'LARGEUR MM',
  'HAUTEUR MM',
  'FORMAT FEUILLE BASE',
  'PIÈCES PAR FEUILLE',
  'ROTATION AUTORISÉE',
  'MARGE MM',
  'ESPACE MM',
  'VISIBLE POS',
  'ACTIF',
  'COMMENTAIRE',
] as const;

export const CARTERIE_REGLES_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'SOURCE PRIX BASE',
  'UTILISE IMPRESSION SANS FINITION',
  'UTILISE FINITIONS',
  'UTILISE DÉCOUPE',
  'UTILISE PALIER',
  'PELLICULAGE A4',
  'GAUFRAGE A4',
  'DORURE A4',
  'VERNIS A4',
  'COINS PAR FEUILLE',
  'PRIX DÉCOUPE PIÈCE',
  'FORMULE',
  'VISIBLE POS',
  'ACTIF',
  'COMMENTAIRE',
] as const;

/** Override Excel / Admin — number legacy = pièces uniquement. */
export type CarterieImpositionOverride =
  | number
  | {
      pieces?: number;
      largeurMm?: number;
      hauteurMm?: number;
      formatFeuilleBase?: string;
      rotationAutorisee?: boolean;
      margeMm?: number;
      espaceMm?: number;
      visiblePos?: boolean;
      actif?: boolean;
      commentaire?: string;
    };

export type CarterieImpositionRule = {
  id: string;
  article: string;
  formatFini: string;
  largeurMm: number;
  hauteurMm: number;
  formatFeuilleBase: string;
  piecesParFeuille: number;
  rotationAutorisee: boolean;
  margeMm: number;
  espaceMm: number;
  visiblePos: boolean;
  actif: boolean;
  commentaire: string;
};

export type CarteriePricingRuntimeParams = {
  sourcePrixBase: string;
  utiliseImpressionSf: boolean;
  utiliseFinitions: boolean;
  utiliseDecoupe: boolean;
  utilisePalier: boolean;
  prixDecoupeParPiece: number;
  pelliculageA4: number;
  gaufrageA4: number;
  dorureA4: number;
  vernisA4: number;
  coinsParFeuille: number;
  visiblePos: boolean;
  actif: boolean;
  formule: string;
  commentaire: string;
  /** Overrides manuels format → pièces / dims / feuille (prioritaires sur auto) */
  impositionOverrides: Record<string, CarterieImpositionOverride>;
};

export const DEFAULT_CARTERIE_RUNTIME_PARAMS: CarteriePricingRuntimeParams = {
  sourcePrixBase: 'Grille Carte de visite (PRIX 2026)',
  utiliseImpressionSf: true,
  utiliseFinitions: true,
  utiliseDecoupe: true,
  utilisePalier: false, // PU ISF déjà palieré par qty feuille — éviter double remise
  prixDecoupeParPiece: FINITION_BASE_PRICES.decoupeDroitePapier,
  pelliculageA4: FINITION_BASE_PRICES.pelliculageA4Recto,
  gaufrageA4: FINITION_BASE_PRICES.gaufrageA4,
  dorureA4: FINITION_BASE_PRICES.dorureStandardA4,
  vernisA4: FINITION_BASE_PRICES.vernisA4Recto,
  coinsParFeuille: FINITION_BASE_PRICES.coinsArrondisPerSheet,
  visiblePos: true,
  actif: true,
  formule: 'PRIX2026_grille_piece (+ extras finitions hors grille) ; fallback ISF feuille ÷ pièces + découpe',
  commentaire:
    'Source commerciale = onglet Excel « Carte de visite » (ex. PCB recto 50–199 = 200 Ar). Fallback ISF feuille ÷ pièces si format perso / hors grille.',
  impositionOverrides: {
    '85×55 mm': 10,
    '90×50 mm': 10,
    '90×55 mm': 10,
    '91×55 mm': 10,
    'Carré — 55×55 mm': 16,
  },
};

/** Formats POS carterie étendus (visite + fidélité + voeux courants). */
export const CARTERIE_DEFAULT_IMPOSITION_SEED: Array<{
  formatFini: string;
  sheet: string;
  pieces?: number;
  comment?: string;
}> = [
  { formatFini: '85×55 mm', sheet: 'A4', pieces: 10, comment: 'Carte de visite standard' },
  { formatFini: '90×50 mm', sheet: 'A4', pieces: 10 },
  { formatFini: '90×55 mm', sheet: 'A4', pieces: 10 },
  { formatFini: '91×55 mm', sheet: 'A4', pieces: 10 },
  { formatFini: 'Carré — 55×55 mm', sheet: 'A4', pieces: 16 },
  { formatFini: 'A6 — 105×148 mm', sheet: 'A4', pieces: 4, comment: 'Carte de vœux / invitation' },
  { formatFini: 'A5 — 148×210 mm', sheet: 'A4', pieces: 2 },
  { formatFini: 'DL — 100×210 mm', sheet: 'A4', pieces: 3 },
  { formatFini: '100×150 mm', sheet: 'A4', pieces: 4 },
  { formatFini: '150×200 mm', sheet: 'A3', pieces: 4 },
  { formatFini: 'Poker — 63×88 mm', sheet: 'A4', pieces: 8 },
  { formatFini: 'Format personnalisé', sheet: 'A4', pieces: 0, comment: 'Capacité à définir' },
];

let runtimeParams: CarteriePricingRuntimeParams = structuredClone(DEFAULT_CARTERIE_RUNTIME_PARAMS);

function resolveFinitionAmount(current: number, hardcoded: number, effective: number): number {
  // Valeur encore égale au hardcode Excel → prendre effective (0 en STRICT sans Admin)
  if (current === hardcoded) return effective;
  if (isStrictCarterieRuntime() && current === hardcoded) return effective;
  return current;
}

export function getCarterieRuntimeParams(): CarteriePricingRuntimeParams {
  const P = getEffectiveFinitionBasePrices();
  return {
    ...runtimeParams,
    prixDecoupeParPiece: resolveFinitionAmount(
      runtimeParams.prixDecoupeParPiece,
      FINITION_BASE_PRICES.decoupeDroitePapier,
      P.decoupeDroitePapier,
    ),
    pelliculageA4: resolveFinitionAmount(
      runtimeParams.pelliculageA4,
      FINITION_BASE_PRICES.pelliculageA4Recto,
      P.pelliculageA4Recto,
    ),
    gaufrageA4: resolveFinitionAmount(
      runtimeParams.gaufrageA4,
      FINITION_BASE_PRICES.gaufrageA4,
      P.gaufrageA4,
    ),
    dorureA4: resolveFinitionAmount(
      runtimeParams.dorureA4,
      FINITION_BASE_PRICES.dorureStandardA4,
      P.dorureStandardA4,
    ),
    vernisA4: resolveFinitionAmount(
      runtimeParams.vernisA4,
      FINITION_BASE_PRICES.vernisA4Recto,
      P.vernisA4Recto,
    ),
    coinsParFeuille: resolveFinitionAmount(
      runtimeParams.coinsParFeuille,
      FINITION_BASE_PRICES.coinsArrondisPerSheet,
      P.coinsArrondisPerSheet,
    ),
  };
}

export function normalizeCarterieImpositionOverride(
  raw: CarterieImpositionOverride | undefined | null,
): Exclude<CarterieImpositionOverride, number> {
  if (raw == null) return {};
  if (typeof raw === 'number') return raw > 0 ? { pieces: Math.floor(raw) } : {};
  return raw;
}

export function setCarterieRuntimeParams(
  patch: Partial<CarteriePricingRuntimeParams>,
): CarteriePricingRuntimeParams {
  runtimeParams = {
    ...runtimeParams,
    ...patch,
    impositionOverrides: {
      ...runtimeParams.impositionOverrides,
      ...(patch.impositionOverrides ?? {}),
    },
  };
  return runtimeParams;
}

export function resetCarterieRuntimeParams(): void {
  runtimeParams = structuredClone(DEFAULT_CARTERIE_RUNTIME_PARAMS);
}

export function resolveCarteriePiecesPerSheet(
  formatFini: string,
  sheetFormat = 'A4',
  dims?: { w: number; h: number } | null,
  customPieces?: number | null,
): ReturnType<typeof calculatePiecesPerSheet> {
  const params = getCarterieRuntimeParams();
  const overrideKey = Object.keys(params.impositionOverrides).find(
    (k) => k.toLowerCase() === formatFini.trim().toLowerCase(),
  );
  const ov = normalizeCarterieImpositionOverride(
    overrideKey ? params.impositionOverrides[overrideKey] : null,
  );
  const manual =
    customPieces != null && customPieces > 0
      ? customPieces
      : ov.pieces != null && ov.pieces > 0
        ? ov.pieces
        : null;

  const parsed = dims ?? parseCardDimensionsMm(formatFini);
  const sheet = ov.formatFeuilleBase || sheetFormat;
  return calculatePiecesPerSheet({
    sheetFormat: sheet,
    cardWidth: ov.largeurMm && ov.largeurMm > 0 ? ov.largeurMm : (parsed?.w ?? 0),
    cardHeight: ov.hauteurMm && ov.hauteurMm > 0 ? ov.hauteurMm : (parsed?.h ?? 0),
    marginMm: ov.margeMm ?? 0,
    gapMm: ov.espaceMm ?? 0,
    allowRotation: ov.rotationAutorisee !== false,
    manualPieces: manual && manual > 0 ? manual : null,
  });
}

export function buildCanonicalCarterieImpositionRules(
  params: CarteriePricingRuntimeParams = getCarterieRuntimeParams(),
): CarterieImpositionRule[] {
  const seedFormats = new Set(CARTERIE_DEFAULT_IMPOSITION_SEED.map((s) => s.formatFini));
  const extraFormats = Object.keys(params.impositionOverrides).filter((f) => !seedFormats.has(f));
  const allSeeds = [
    ...CARTERIE_DEFAULT_IMPOSITION_SEED,
    ...extraFormats.map((formatFini) => ({
      formatFini,
      sheet: 'A4',
      pieces: undefined as number | undefined,
      comment: 'Ajouté via Excel Admin',
    })),
  ];

  return allSeeds.map((seed, idx) => {
    const ov = normalizeCarterieImpositionOverride(params.impositionOverrides[seed.formatFini]);
    const dims = parseCardDimensionsMm(seed.formatFini);
    const sheet = ov.formatFeuilleBase || seed.sheet;
    const fit = resolveCarteriePiecesPerSheet(
      seed.formatFini,
      sheet,
      {
        w: ov.largeurMm && ov.largeurMm > 0 ? ov.largeurMm : (dims?.w ?? 0),
        h: ov.hauteurMm && ov.hauteurMm > 0 ? ov.hauteurMm : (dims?.h ?? 0),
      },
      ov.pieces ?? seed.pieces ?? null,
    );
    return {
      id: `CRT-IMP-${String(idx + 1).padStart(2, '0')}`,
      article: 'cv-*',
      formatFini: seed.formatFini,
      largeurMm: ov.largeurMm && ov.largeurMm > 0 ? ov.largeurMm : (dims?.w ?? 0),
      hauteurMm: ov.hauteurMm && ov.hauteurMm > 0 ? ov.hauteurMm : (dims?.h ?? 0),
      formatFeuilleBase: sheet,
      piecesParFeuille: fit.pieces,
      rotationAutorisee: ov.rotationAutorisee !== false,
      margeMm: ov.margeMm ?? 0,
      espaceMm: ov.espaceMm ?? 0,
      visiblePos: ov.visiblePos !== false && params.visiblePos,
      actif: ov.actif !== false && params.actif && fit.pieces > 0,
      commentaire: ov.commentaire ?? seed.comment ?? fit.formula,
    };
  });
}

export function carterieImpositionToExcelRow(row: CarterieImpositionRule): Record<string, string | number | boolean> {
  return {
    ID: row.id,
    ARTICLE: row.article,
    'FORMAT FINI': row.formatFini,
    'LARGEUR MM': row.largeurMm,
    'HAUTEUR MM': row.hauteurMm,
    'FORMAT FEUILLE BASE': row.formatFeuilleBase,
    'PIÈCES PAR FEUILLE': row.piecesParFeuille,
    'ROTATION AUTORISÉE': row.rotationAutorisee ? 'oui' : 'non',
    'MARGE MM': row.margeMm,
    'ESPACE MM': row.espaceMm,
    'VISIBLE POS': row.visiblePos ? 'oui' : 'non',
    ACTIF: row.actif ? 'oui' : 'non',
    COMMENTAIRE: row.commentaire,
  };
}

export function carteriePricingRuleToExcelRow(
  params: CarteriePricingRuntimeParams = getCarterieRuntimeParams(),
): Record<string, string | number | boolean> {
  return {
    ID: 'CRT-REG-01',
    ARTICLE: 'cv-*',
    'SOURCE PRIX BASE': params.sourcePrixBase,
    'UTILISE IMPRESSION SANS FINITION': params.utiliseImpressionSf ? 'oui' : 'non',
    'UTILISE FINITIONS': params.utiliseFinitions ? 'oui' : 'non',
    'UTILISE DÉCOUPE': params.utiliseDecoupe ? 'oui' : 'non',
    'UTILISE PALIER': params.utilisePalier ? 'oui' : 'non',
    'PELLICULAGE A4': params.pelliculageA4,
    'GAUFRAGE A4': params.gaufrageA4,
    'DORURE A4': params.dorureA4,
    'VERNIS A4': params.vernisA4,
    'COINS PAR FEUILLE': params.coinsParFeuille,
    'PRIX DÉCOUPE PIÈCE': params.prixDecoupeParPiece,
    FORMULE: params.formule,
    'VISIBLE POS': params.visiblePos ? 'oui' : 'non',
    ACTIF: params.actif ? 'oui' : 'non',
    COMMENTAIRE: params.commentaire,
  };
}

function pick(raw: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = raw[k] ?? raw[k.toUpperCase()] ?? raw[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseBool(v: string, fallback = true): boolean {
  if (!v) return fallback;
  const s = v.toLowerCase();
  if (['non', 'no', '0', 'false', 'off'].includes(s)) return false;
  if (['oui', 'yes', '1', 'true', 'on'].includes(s)) return true;
  return fallback;
}

function num(v: string, fallback: number): number {
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Import feuille 02_CARTERIE_FORMATS_IMPOSITION → overrides complets. */
export function parseCarterieImpositionExcelRows(
  rows: Record<string, unknown>[],
): Record<string, CarterieImpositionOverride> {
  const overrides: Record<string, CarterieImpositionOverride> = {};
  for (const raw of rows) {
    const format = pick(raw, 'FORMAT FINI', 'format fini', 'FORMAT');
    if (!format) continue;
    const pieces = num(pick(raw, 'PIÈCES PAR FEUILLE', 'pieces', 'PIECES'), 0);
    const largeurMm = num(pick(raw, 'LARGEUR MM', 'largeur'), 0);
    const hauteurMm = num(pick(raw, 'HAUTEUR MM', 'hauteur'), 0);
    const sheet = pick(raw, 'FORMAT FEUILLE BASE', 'FEUILLE', 'sheet');
    const rotation = pick(raw, 'ROTATION AUTORISÉE', 'ROTATION AUTORISEE', 'ROTATION');
    const margeMm = num(pick(raw, 'MARGE MM', 'marge'), NaN);
    const espaceMm = num(pick(raw, 'ESPACE MM', 'espace', 'gap'), NaN);
    const visible = pick(raw, 'VISIBLE POS');
    const actif = pick(raw, 'ACTIF');
    const commentaire = pick(raw, 'COMMENTAIRE');
    const ov: Exclude<CarterieImpositionOverride, number> = {};
    if (pieces > 0) ov.pieces = Math.floor(pieces);
    if (largeurMm > 0) ov.largeurMm = largeurMm;
    if (hauteurMm > 0) ov.hauteurMm = hauteurMm;
    if (sheet) ov.formatFeuilleBase = sheet;
    if (rotation) ov.rotationAutorisee = parseBool(rotation, true);
    if (Number.isFinite(margeMm) && margeMm >= 0) ov.margeMm = margeMm;
    if (Number.isFinite(espaceMm) && espaceMm >= 0) ov.espaceMm = espaceMm;
    if (visible) ov.visiblePos = parseBool(visible, true);
    if (actif) ov.actif = parseBool(actif, true);
    if (commentaire) ov.commentaire = commentaire;
    if (Object.keys(ov).length) overrides[format] = ov;
  }
  return overrides;
}

/** Import feuille 05_CARTERIE_REGLES_PRIX + montants finition/découpe. */
export function parseCarterieRulesExcelRows(
  rows: Record<string, unknown>[],
): Partial<CarteriePricingRuntimeParams> {
  const cur = getCarterieRuntimeParams();
  const patch: Partial<CarteriePricingRuntimeParams> = {};
  for (const raw of rows) {
    const src = pick(raw, 'SOURCE PRIX BASE');
    if (src) patch.sourcePrixBase = src;
    const isf = pick(raw, 'UTILISE IMPRESSION SANS FINITION');
    if (isf) patch.utiliseImpressionSf = parseBool(isf, true);
    const fin = pick(raw, 'UTILISE FINITIONS');
    if (fin) patch.utiliseFinitions = parseBool(fin, true);
    const dec = pick(raw, 'UTILISE DÉCOUPE', 'UTILISE DECOUPE');
    if (dec) patch.utiliseDecoupe = parseBool(dec, true);
    const pal = pick(raw, 'UTILISE PALIER');
    if (pal) patch.utilisePalier = parseBool(pal, false);
    const formule = pick(raw, 'FORMULE');
    if (formule) patch.formule = formule;
    const note = pick(raw, 'COMMENTAIRE');
    if (note) patch.commentaire = note;
    const vis = pick(raw, 'VISIBLE POS');
    if (vis) patch.visiblePos = parseBool(vis, true);
    const act = pick(raw, 'ACTIF');
    if (act) patch.actif = parseBool(act, true);
    const decoupe = pick(raw, 'PRIX DÉCOUPE PIÈCE', 'PRIX DECOUPE', 'DÉCOUPE');
    if (decoupe) patch.prixDecoupeParPiece = num(decoupe, cur.prixDecoupeParPiece);
    const pell = pick(raw, 'PELLICULAGE A4', 'PRIX PELLICULAGE A4');
    if (pell) patch.pelliculageA4 = num(pell, cur.pelliculageA4);
    const gauf = pick(raw, 'GAUFRAGE A4', 'PRIX GAUFRAGE A4');
    if (gauf) patch.gaufrageA4 = num(gauf, cur.gaufrageA4);
    const dor = pick(raw, 'DORURE A4', 'PRIX DORURE A4');
    if (dor) patch.dorureA4 = num(dor, cur.dorureA4);
    const vern = pick(raw, 'VERNIS A4', 'PRIX VERNIS A4');
    if (vern) patch.vernisA4 = num(vern, cur.vernisA4);
    const coins = pick(raw, 'COINS PAR FEUILLE', 'COINS A4', 'COINS');
    if (coins) patch.coinsParFeuille = num(coins, cur.coinsParFeuille);
  }
  return patch;
}
