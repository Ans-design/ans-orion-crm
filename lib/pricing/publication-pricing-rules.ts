/**
 * Paramètres Admin publications (livres, bloc-notes, agendas, calendriers).
 * SystemConfig — pas de duplication des grilles ISF / Finitions.
 */

import { FINITION_BASE_PRICES } from '@/lib/finition/finition-price-catalog';

export const PUBLICATION_PRICING_RULES_CONFIG_KEY = 'publication_pricing_rules';

export const PUBLICATION_REGLES_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'TYPE PUBLICATION',
  'SOURCE PRIX IMPRESSION',
  'SOURCE PRIX RELIURE',
  'SOURCE PRIX FINITION',
  'FORMULE',
  'FALLBACK PU NOIR A4',
  'FALLBACK PU QUADRI A4',
  'FALLBACK COUV PRINT',
  'SUPPLÉMENT COUV RIGIDE',
  'PELLICULAGE COUV A4',
  'BLOC COLLÉ AR',
  'COINS PAR EXEMPLAIRE',
  'GRAMMAGE COUV DÉFAUT',
  'ALLOW FALLBACK PRINT',
  'UTILISE PALIER',
  'VISIBLE POS',
  'ACTIF',
  'COMMENTAIRE',
] as const;

export const PUBLICATION_PALIERS_EXCEL_COLUMNS = [
  'ID',
  'QTY MIN',
  'TAUX',
  'COMMENTAIRE',
] as const;

export type PublicationVolumeTier = { minQty: number; rate: number };

export type PublicationPricingRuntimeParams = {
  sourcePrixImpression: string;
  sourcePrixReliure: string;
  sourcePrixFinition: string;
  formule: string;
  /** Utilisé si ISF indisponible et allowFallbackPrint */
  fallbackPuNoirA4: number;
  fallbackPuQuadriA4: number;
  fallbackCoverPrintAr: number;
  coverRigidSupplementAr: number;
  pelliculageCouvertureA4: number;
  defaultCoverGrammage: string;
  blocColleAr: number;
  coinsParExemplaire: number;
  allowFallbackPrint: boolean;
  utilisePalier: boolean;
  volumeTiers: PublicationVolumeTier[];
  visiblePos: boolean;
  actif: boolean;
  commentaire: string;
};

export const DEFAULT_PUBLICATION_RUNTIME_PARAMS: PublicationPricingRuntimeParams = {
  sourcePrixImpression: 'Impression sans finition',
  sourcePrixReliure: 'Finitions & Reliures',
  sourcePrixFinition: 'Finitions & Reliures',
  formule: 'ISF_pages + couverture(nombre×PU) + reliure_x1 + finitions - remise',
  fallbackPuNoirA4: 200,
  fallbackPuQuadriA4: 400,
  fallbackCoverPrintAr: 250,
  coverRigidSupplementAr: 5000,
  pelliculageCouvertureA4: FINITION_BASE_PRICES.pelliculageA4Recto,
  defaultCoverGrammage: '300g',
  blocColleAr: 500,
  coinsParExemplaire: FINITION_BASE_PRICES.coinsArrondisPerSheet,
  allowFallbackPrint: false,
  // PU ISF déjà palieré par qty — activer seulement si remise % Admin souhaitée en plus
  utilisePalier: false,
  volumeTiers: [
    { minQty: 1000, rate: 0.12 },
    { minQty: 500, rate: 0.1 },
    { minQty: 250, rate: 0.08 },
    { minQty: 100, rate: 0.05 },
    { minQty: 50, rate: 0.03 },
  ],
  visiblePos: true,
  actif: true,
  commentaire:
    'Publications = ISF × pages + couverture (nombre × PU, sans R/V) + reliure (1×/ex.) + finitions. Fallback Admin si ISF incomplet.',
};

let runtimeParams: PublicationPricingRuntimeParams = structuredClone(DEFAULT_PUBLICATION_RUNTIME_PARAMS);

export function getPublicationRuntimeParams(): PublicationPricingRuntimeParams {
  return runtimeParams;
}

export function setPublicationRuntimeParams(
  patch: Partial<PublicationPricingRuntimeParams>,
): PublicationPricingRuntimeParams {
  runtimeParams = {
    ...runtimeParams,
    ...patch,
    volumeTiers: patch.volumeTiers ?? runtimeParams.volumeTiers,
  };
  return runtimeParams;
}

export function resetPublicationRuntimeParams(): void {
  runtimeParams = structuredClone(DEFAULT_PUBLICATION_RUNTIME_PARAMS);
}

export function publicationRuleToExcelRow(
  params: PublicationPricingRuntimeParams = getPublicationRuntimeParams(),
): Record<string, string | number | boolean> {
  return {
    ID: 'PUB-REG-01',
    ARTICLE: 'bk-* / bn-* / cal-*',
    'TYPE PUBLICATION': 'livre_bloc_agenda_calendrier',
    'SOURCE PRIX IMPRESSION': params.sourcePrixImpression,
    'SOURCE PRIX RELIURE': params.sourcePrixReliure,
    'SOURCE PRIX FINITION': params.sourcePrixFinition,
    FORMULE: params.formule,
    'FALLBACK PU NOIR A4': params.fallbackPuNoirA4,
    'FALLBACK PU QUADRI A4': params.fallbackPuQuadriA4,
    'FALLBACK COUV PRINT': params.fallbackCoverPrintAr,
    'SUPPLÉMENT COUV RIGIDE': params.coverRigidSupplementAr,
    'PELLICULAGE COUV A4': params.pelliculageCouvertureA4,
    'BLOC COLLÉ AR': params.blocColleAr,
    'COINS PAR EXEMPLAIRE': params.coinsParExemplaire,
    'GRAMMAGE COUV DÉFAUT': params.defaultCoverGrammage,
    'ALLOW FALLBACK PRINT': params.allowFallbackPrint ? 'oui' : 'non',
    'UTILISE PALIER': params.utilisePalier ? 'oui' : 'non',
    'VISIBLE POS': params.visiblePos ? 'oui' : 'non',
    ACTIF: params.actif ? 'oui' : 'non',
    COMMENTAIRE: params.commentaire,
  };
}

export function publicationVolumeTiersToExcelRows(
  params: PublicationPricingRuntimeParams = getPublicationRuntimeParams(),
): Record<string, string | number>[] {
  return (params.volumeTiers ?? []).map((t, i) => ({
    ID: `PUB-PAL-${String(i + 1).padStart(2, '0')}`,
    'QTY MIN': t.minQty,
    TAUX: t.rate,
    COMMENTAIRE: `Remise ${Math.round(t.rate * 100)}% dès ${t.minQty}`,
  }));
}

function pick(raw: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = raw[k] ?? raw[k.toUpperCase()] ?? raw[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(v: string, fb: number) {
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : fb;
}

function parseBool(v: string, fb = true) {
  if (!v) return fb;
  const s = v.toLowerCase();
  if (['non', 'no', '0', 'false'].includes(s)) return false;
  if (['oui', 'yes', '1', 'true'].includes(s)) return true;
  return fb;
}

export function parsePublicationRulesExcelRows(
  rows: Record<string, unknown>[],
): Partial<PublicationPricingRuntimeParams> {
  const cur = getPublicationRuntimeParams();
  const patch: Partial<PublicationPricingRuntimeParams> = {};
  for (const raw of rows) {
    const n = pick(raw, 'FALLBACK PU NOIR A4');
    if (n) patch.fallbackPuNoirA4 = num(n, cur.fallbackPuNoirA4);
    const q = pick(raw, 'FALLBACK PU QUADRI A4');
    if (q) patch.fallbackPuQuadriA4 = num(q, cur.fallbackPuQuadriA4);
    const c = pick(raw, 'FALLBACK COUV PRINT');
    if (c) patch.fallbackCoverPrintAr = num(c, cur.fallbackCoverPrintAr);
    const r = pick(raw, 'SUPPLÉMENT COUV RIGIDE');
    if (r) patch.coverRigidSupplementAr = num(r, cur.coverRigidSupplementAr);
    const p = pick(raw, 'PELLICULAGE COUV A4');
    if (p) patch.pelliculageCouvertureA4 = num(p, cur.pelliculageCouvertureA4);
    const b = pick(raw, 'BLOC COLLÉ AR');
    if (b) patch.blocColleAr = num(b, cur.blocColleAr);
    const coins = pick(raw, 'COINS PAR EXEMPLAIRE', 'COINS');
    if (coins) patch.coinsParExemplaire = num(coins, cur.coinsParExemplaire);
    const gram = pick(raw, 'GRAMMAGE COUV DÉFAUT', 'GRAMMAGE COUV DEFAUT');
    if (gram) patch.defaultCoverGrammage = gram;
    const fb = pick(raw, 'ALLOW FALLBACK PRINT', 'FALLBACK PRINT');
    if (fb) patch.allowFallbackPrint = parseBool(fb, false);
    const pal = pick(raw, 'UTILISE PALIER');
    if (pal) patch.utilisePalier = parseBool(pal, false);
    const vis = pick(raw, 'VISIBLE POS');
    if (vis) patch.visiblePos = parseBool(vis, true);
    const act = pick(raw, 'ACTIF');
    if (act) patch.actif = parseBool(act, true);
    const note = pick(raw, 'COMMENTAIRE');
    if (note) patch.commentaire = note;
    const srcI = pick(raw, 'SOURCE PRIX IMPRESSION');
    if (srcI) patch.sourcePrixImpression = srcI;
    const srcR = pick(raw, 'SOURCE PRIX RELIURE');
    if (srcR) patch.sourcePrixReliure = srcR;
    const srcF = pick(raw, 'SOURCE PRIX FINITION');
    if (srcF) patch.sourcePrixFinition = srcF;
    const formule = pick(raw, 'FORMULE');
    if (formule) patch.formule = formule;
  }
  return patch;
}

export function parsePublicationVolumeTiersExcelRows(
  rows: Record<string, unknown>[],
): PublicationVolumeTier[] {
  const tiers: PublicationVolumeTier[] = [];
  for (const raw of rows) {
    const minQty = num(pick(raw, 'QTY MIN', 'MIN QTY', 'QUANTITÉ MIN', 'QTE MIN'), 0);
    let rate = num(pick(raw, 'TAUX', 'RATE', 'REMISE'), NaN);
    if (!Number.isFinite(rate)) continue;
    // Accepte 12 ou 0.12
    if (rate > 1) rate = rate / 100;
    if (minQty > 0 && rate >= 0 && rate < 1) {
      tiers.push({ minQty: Math.floor(minQty), rate });
    }
  }
  return tiers.sort((a, b) => b.minQty - a.minQty);
}
