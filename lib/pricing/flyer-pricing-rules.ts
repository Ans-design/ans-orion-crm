/**
 * Règles FlyerPricingRule — source calcul = Impression sans finition + pliage.
 * Ne duplique pas les grilles ISF (matière / format / face / qty).
 */

import { FLYER_CANONICAL_ID } from '@/lib/pos/flyer-catalog';
import { FINITION_BASE_PRICES } from '@/lib/finition/finition-price-catalog';
import { FLYER_VOLET_OPTIONS } from '@/lib/data/flyer-material-catalog';

/** Copie locale pour éviter import circulaire avec flyer-pricing.ts */
function voletsToPlis(voletsRaw: string): number {
  const s = String(voletsRaw ?? '').trim().toLowerCase();
  if (!s || /personnalis/.test(s)) return -1;
  const fromLabel = s.match(/(\d+)\s*plis?/);
  if (fromLabel) return Math.max(0, parseInt(fromLabel[1]!, 10));
  const n = s.match(/(\d+)\s*volets?/);
  if (n) {
    const volets = parseInt(n[1]!, 10);
    if (volets <= 1) return 0;
    return volets - 1;
  }
  if (/feuille\s*plate|1\s*volet/.test(s)) return 0;
  return 0;
}

export const FLYER_PRICING_RULES_CONFIG_KEY = 'flyer_pricing_rules';

export const FLYER_REGLES_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'SOURCE PRIX BASE',
  'TYPE CALCUL',
  'NOMBRE VOLETS',
  'NOMBRE PLIS',
  'PRIX PLI A4',
  'COEFFICIENT FORMAT',
  'UTILISE PALIER',
  'VISIBLE POS',
  'ACTIF',
  'STATUT',
  'COMMENTAIRE',
] as const;

export type FlyerPricingRuleRow = {
  id: string;
  article: string;
  sourcePrixBase: string;
  typeCalcul: string;
  nombreVolets: string;
  nombrePlis: number;
  prixPliA4: number;
  coefficientFormat: string;
  utilisePalier: boolean;
  visiblePos: boolean;
  actif: boolean;
  statut: string;
  commentaire: string;
};

export type FlyerPricingRuntimeParams = {
  prixPliA4: number;
  utilisePalier: boolean;
  visiblePos: boolean;
  actif: boolean;
  sourcePrixBase: string;
  commentaire: string;
};

export const DEFAULT_FLYER_RUNTIME_PARAMS: FlyerPricingRuntimeParams = {
  prixPliA4: FINITION_BASE_PRICES.rainagePerPliA4,
  utilisePalier: false, // PU ISF déjà palieré par qty — éviter double remise
  visiblePos: true,
  actif: true,
  sourcePrixBase: 'Impression sans finition',
  commentaire:
    'Flyer = ISF (format/matière/grammage/face/qty) + pliage (nb plis × prix pli A4 × coeff format). Paliers = remises ISF.',
};

let runtimeParams: FlyerPricingRuntimeParams = { ...DEFAULT_FLYER_RUNTIME_PARAMS };

export function getFlyerRuntimeParams(): FlyerPricingRuntimeParams {
  return runtimeParams;
}

export function setFlyerRuntimeParams(patch: Partial<FlyerPricingRuntimeParams>): FlyerPricingRuntimeParams {
  runtimeParams = {
    ...runtimeParams,
    ...patch,
    prixPliA4:
      patch.prixPliA4 != null && Number.isFinite(patch.prixPliA4) && patch.prixPliA4 > 0
        ? Math.round(patch.prixPliA4)
        : runtimeParams.prixPliA4,
  };
  return runtimeParams;
}

export function resetFlyerRuntimeParams(): void {
  runtimeParams = { ...DEFAULT_FLYER_RUNTIME_PARAMS };
}

/** Matrice volets → plis (1 volet = 0 pli). */
export function buildCanonicalFlyerPricingRules(
  params: FlyerPricingRuntimeParams = getFlyerRuntimeParams(),
): FlyerPricingRuleRow[] {
  return FLYER_VOLET_OPTIONS.map((label, idx) => {
    const plis = voletsToPlis(label);
    const isCustom = /personnalis/i.test(label);
    return {
      id: `FLY-REG-${String(idx + 1).padStart(2, '0')}`,
      article: FLYER_CANONICAL_ID,
      sourcePrixBase: params.sourcePrixBase,
      typeCalcul: 'isf_plus_pliage',
      nombreVolets: label,
      nombrePlis: isCustom ? -1 : Math.max(0, plis),
      prixPliA4: params.prixPliA4,
      coefficientFormat: 'A5=0.5 · A4=1 · A3=2 · A3+=2.2 · DL/ISF',
      utilisePalier: params.utilisePalier,
      visiblePos: params.visiblePos,
      actif: params.actif && !isCustom,
      statut: isCustom ? 'sur_devis' : params.actif ? 'published' : 'draft',
      commentaire: isCustom
        ? 'Volets personnalisés → prix en attente / sur devis'
        : plis === 0
          ? '1 volet = pas de pliage'
          : `${plis} pli(s) × ${params.prixPliA4} Ar × coeff format`,
    };
  });
}

export function flyerRuleToExcelRow(row: FlyerPricingRuleRow): Record<string, string | number | boolean> {
  return {
    ID: row.id,
    ARTICLE: row.article,
    'SOURCE PRIX BASE': row.sourcePrixBase,
    'TYPE CALCUL': row.typeCalcul,
    'NOMBRE VOLETS': row.nombreVolets,
    'NOMBRE PLIS': row.nombrePlis < 0 ? '' : row.nombrePlis,
    'PRIX PLI A4': row.prixPliA4,
    'COEFFICIENT FORMAT': row.coefficientFormat,
    'UTILISE PALIER': row.utilisePalier ? 'oui' : 'non',
    'VISIBLE POS': row.visiblePos ? 'oui' : 'non',
    ACTIF: row.actif ? 'oui' : 'non',
    STATUT: row.statut,
    COMMENTAIRE: row.commentaire,
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

/** Import Excel : lit surtout PRIX PLI A4 / UTILISE PALIER (pas les prix ISF). */
export function parseFlyerRulesExcelRows(
  rows: Record<string, unknown>[],
): Partial<FlyerPricingRuntimeParams> {
  let prixPliA4 = getFlyerRuntimeParams().prixPliA4;
  let utilisePalier = getFlyerRuntimeParams().utilisePalier;
  let visiblePos = getFlyerRuntimeParams().visiblePos;
  let actif = getFlyerRuntimeParams().actif;
  let sourcePrixBase = getFlyerRuntimeParams().sourcePrixBase;
  let commentaire = getFlyerRuntimeParams().commentaire;

  for (const raw of rows) {
    const prixRaw = pick(raw, 'PRIX PLI A4', 'prix pli a4', 'PRIX_PLI_A4');
    if (prixRaw) {
      const n = Number(String(prixRaw).replace(/\s/g, '').replace(',', '.'));
      if (Number.isFinite(n) && n > 0) prixPliA4 = Math.round(n);
    }
    const palier = pick(raw, 'UTILISE PALIER', 'utilise palier');
    if (palier) utilisePalier = parseBool(palier, false);
    const vis = pick(raw, 'VISIBLE POS', 'visible pos');
    if (vis) visiblePos = parseBool(vis, true);
    const act = pick(raw, 'ACTIF', 'actif');
    if (act) actif = parseBool(act, true);
    const src = pick(raw, 'SOURCE PRIX BASE', 'source prix base');
    if (src) sourcePrixBase = src;
    const note = pick(raw, 'COMMENTAIRE', 'commentaire');
    if (note) commentaire = note;
  }

  return { prixPliA4, utilisePalier, visiblePos, actif, sourcePrixBase, commentaire };
}
