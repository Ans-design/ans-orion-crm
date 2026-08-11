/**
 * Catalogue canonique Finitions & Reliures — prix de base Admin / POS.
 * Source de vérité par défaut ; Admin FinishingPrice peut surcharger via unitPrice + reference.
 * Grilles reliure : PRIX 2026.xlsx onglet RELIURE (via SPIRALES).
 */

import { SPIRALES } from '@/lib/data/catalogue';

function isStrictFinitionRuntime(): boolean {
  // Évite import circulaire avec pos-price-policy / publication-core
  if (process.env.STRICT_POS_PRICING === '1' || process.env.STRICT_POS_PRICING === 'true') return true;
  if (process.env.STRICT_POS_PRICING === '0' || process.env.STRICT_POS_PRICING === 'false') {
    return (
      process.env.NODE_ENV === 'production'
      || process.env.VERCEL_ENV === 'production'
      || process.env.HOSTINGER === 'true'
    );
  }
  return (
    process.env.NODE_ENV === 'production'
    || process.env.VERCEL_ENV === 'production'
    || process.env.HOSTINGER === 'true'
    || process.env.USE_PRODUCTION_DB === 'true'
    || (process.env.APP_ENV || '').toLowerCase() === 'ci'
  );
}

export type FinishingCatalogRow = {
  excelId: string;
  name: string;
  category: string;
  type: string;
  reference: string;
  formatRef: string | null;
  unit: string;
  unitPrice: number;
  formulaType: 'fixed' | 'per_unit' | 'per_m2' | 'per_sheet' | 'per_ml' | 'per_face' | 'manual';
  rule: string;
  details: string;
};

/** Prix base A4 / unités métier — source PRIX 2026.xlsx (fallback si Admin FinishingPrice absent). */
export const FINITION_BASE_PRICES = {
  coinsArrondisPerSheet: 50,
  collageSimpleA4: 500,
  collageContreA4: 500,
  coutureSimplePerM2: 30000,
  coutureRenforceePerM2: 40000,
  decoupeDroitePapier: 50,
  decoupeFlexPerMl: 10000,
  decoupeAutocollantCouleurPerMl: 10000,
  decoupeAutocollantImprimePerM2: 10000,
  decoupePhotoboothPerM2: 60000,
  dorureStandardA4: 2000,
  dorureTexteA4: 3000,
  dorureLogoA4: 4000,
  dorureMotifA4: 5000,
  pelliculageA4Recto: 600,
  gaufrageA4: 3000,
  perforation1: 50,
  perforation2: 100,
  perforation4: 150,
  perforationPointilleA4: 50,
  plastificationA4: 2000,
  posePetitFormat: 3000,
  poseGrandFormatLe3m: 10000,
  poseGrandFormatGt3m: 20000,
  rainagePerPliA4: 50,
  vernisA4Recto: 5000,
  spiraleMinMm6: 3000,
  /** Legacy step — préférer SPIRALES (PRIX 2026) via spiralPriceForMm. */
  spiraleStep: 1000,
  piqureMin: 1500,
  dccMin: 6000,
  dccCousuMin: 10000,
} as const;

export type FinitionBasePriceKey = keyof typeof FINITION_BASE_PRICES;

/** Surcharges runtime depuis Admin FinishingPrice (Sync / ensure). */
let runtimePriceOverrides: Partial<Record<FinitionBasePriceKey, number>> = {};

export function setFinitionRuntimePriceOverrides(
  patch: Partial<Record<FinitionBasePriceKey, number>>,
) {
  for (const [k, v] of Object.entries(patch) as Array<[FinitionBasePriceKey, number]>) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0 && k in FINITION_BASE_PRICES) {
      runtimePriceOverrides[k] = Math.round(v);
    }
  }
}

export function resetFinitionRuntimePriceOverrides() {
  runtimePriceOverrides = {};
}

/** Catalogue + Admin — source effective pour moteurs finition / carterie / publications.
 * En STRICT (prod) : uniquement les surcharges Admin — jamais les constantes Excel hardcodées.
 */
export function getEffectiveFinitionBasePrices(): Record<FinitionBasePriceKey, number> {
  if (isStrictFinitionRuntime()) {
    const zeros = {} as Record<FinitionBasePriceKey, number>;
    for (const k of Object.keys(FINITION_BASE_PRICES) as FinitionBasePriceKey[]) {
      zeros[k] = runtimePriceOverrides[k] ?? 0;
    }
    return zeros;
  }
  return { ...FINITION_BASE_PRICES, ...runtimePriceOverrides };
}

/** True si au moins une surcharge Admin a été injectée (runtime). */
export function hasFinitionRuntimeOverrides(): boolean {
  return Object.keys(runtimePriceOverrides).length > 0;
}

/** Lignes Admin à upsert (idempotent par excelId / reference). */
export function listCanonicalFinishingCatalog(): FinishingCatalogRow[] {
  const P = FINITION_BASE_PRICES;
  return [
    {
      excelId: 'FIN-COINS-50',
      name: 'Coins arrondis',
      category: 'coins_arrondis',
      type: 'Coins arrondis',
      reference: 'fin-coins',
      formatRef: null,
      unit: 'feuille',
      unitPrice: P.coinsArrondisPerSheet,
      formulaType: 'per_sheet',
      rule: '50 Ar × feuille',
      details: 'Toute feuille / tout format — hors types découpe',
    },
    {
      excelId: 'FIN-COLLAGE-SIMPLE-A4',
      name: 'Collage simple A4',
      category: 'collage',
      type: 'Collage simple',
      reference: 'fin-collage:simple',
      formatRef: 'A4',
      unit: 'feuille',
      unitPrice: P.collageSimpleA4,
      formulaType: 'per_sheet',
      rule: 'A5=/2 · A3=×2',
      details: 'Dos carré exclu (reliure)',
    },
    {
      excelId: 'FIN-COLLAGE-CONTRE-A4',
      name: 'Contre-collage A4',
      category: 'collage',
      type: 'Contre-collage',
      reference: 'fin-collage:contre',
      formatRef: 'A4',
      unit: 'feuille',
      unitPrice: P.collageContreA4,
      formulaType: 'per_sheet',
      rule: 'A5=/2 · A3=×2',
      details: '',
    },
    {
      excelId: 'FIN-COUTURE-SIMPLE',
      name: 'Couture oriflamme simple',
      category: 'couture',
      type: 'Couture simple',
      reference: 'fin-couture:simple',
      formatRef: null,
      unit: 'pièce',
      unitPrice: P.coutureSimplePerM2,
      formulaType: 'fixed',
      rule: 'Tarif forfait oriflamme (PRIX 2026)',
      details: 'Onglet Finition&faconnage — Couture simple',
    },
    {
      excelId: 'FIN-COUTURE-RENFORCEE',
      name: 'Couture oriflamme renforcée',
      category: 'couture',
      type: 'Couture renforcée (maxi)',
      reference: 'fin-couture:renforcee',
      formatRef: null,
      unit: 'pièce',
      unitPrice: P.coutureRenforceePerM2,
      formulaType: 'fixed',
      rule: 'Tarif forfait oriflamme (PRIX 2026)',
      details: 'Onglet Finition&faconnage — Couture renforcée (maxi)',
    },
    {
      excelId: 'FIN-DECOUPE-DROITE',
      name: 'Découpe droite papier',
      category: 'decoupe',
      type: 'Découpe droite',
      reference: 'fin-decoupe:droite',
      formatRef: null,
      unit: 'pièce',
      unitPrice: P.decoupeDroitePapier,
      formulaType: 'per_unit',
      rule: '50 Ar / pièce',
      details: 'Coins arrondis exclus',
    },
    {
      excelId: 'FIN-DECOUPE-FLEX',
      name: 'Découpe flex',
      category: 'decoupe',
      type: 'Découpe finition (Flex)',
      reference: 'fin-decoupe:flex',
      formatRef: null,
      unit: 'mètre linéaire',
      unitPrice: P.decoupeFlexPerMl,
      formulaType: 'per_ml',
      rule: 'longueur m × 10 000',
      details: '',
    },
    {
      excelId: 'FIN-DECOUPE-AUTO-COULEUR',
      name: 'Découpe autocollant couleur',
      category: 'decoupe',
      type: 'Découpe Autocollant couleur',
      reference: 'fin-decoupe:auto-couleur',
      formatRef: null,
      unit: 'mètre linéaire',
      unitPrice: P.decoupeAutocollantCouleurPerMl,
      formulaType: 'per_ml',
      rule: 'longueur m × 10 000',
      details: '',
    },
    {
      excelId: 'FIN-DECOUPE-AUTO-IMPRIME',
      name: 'Découpe autocollant imprimé / vinyle',
      category: 'decoupe',
      type: 'Autocollant imprimé',
      reference: 'fin-decoupe:auto-imprime',
      formatRef: null,
      unit: 'm²',
      unitPrice: P.decoupeAutocollantImprimePerM2,
      formulaType: 'per_m2',
      rule: 'surface m² × 10 000',
      details: '',
    },
    {
      excelId: 'FIN-DECOUPE-PHOTOBOOTH',
      name: 'Découpe photobooth / Plexi / PVC',
      category: 'decoupe',
      type: 'Découpe photobooth PVC/Plexi',
      reference: 'fin-decoupe:photobooth',
      formatRef: null,
      unit: 'm²',
      unitPrice: P.decoupePhotoboothPerM2,
      formulaType: 'per_m2',
      rule: 'surface m² × 75 000',
      details: '',
    },
    {
      excelId: 'FIN-DORURE-STD',
      name: 'Dorure standard A4 / face',
      category: 'dorure',
      type: 'Standard',
      reference: 'fin-dorure:standard',
      formatRef: 'A4',
      unit: 'face',
      unitPrice: P.dorureStandardA4,
      formulaType: 'per_face',
      rule: 'format × faces',
      details: '',
    },
    {
      excelId: 'FIN-DORURE-TEXTE',
      name: 'Dorure texte A4 / face',
      category: 'dorure',
      type: 'Texte',
      reference: 'fin-dorure:texte',
      formatRef: 'A4',
      unit: 'face',
      unitPrice: P.dorureTexteA4,
      formulaType: 'per_face',
      rule: 'format × faces',
      details: '',
    },
    {
      excelId: 'FIN-DORURE-LOGO',
      name: 'Dorure logo A4 / face',
      category: 'dorure',
      type: 'Logo',
      reference: 'fin-dorure:logo',
      formatRef: 'A4',
      unit: 'face',
      unitPrice: P.dorureLogoA4,
      formulaType: 'per_face',
      rule: 'format × faces',
      details: '',
    },
    {
      excelId: 'FIN-DORURE-MOTIF',
      name: 'Dorure motif de fond A4 / face',
      category: 'dorure',
      type: 'Motif de fond',
      reference: 'fin-dorure:motif',
      formatRef: 'A4',
      unit: 'face',
      unitPrice: P.dorureMotifA4,
      formulaType: 'per_face',
      rule: 'format × faces',
      details: '',
    },
    {
      excelId: 'FIN-PELLI-A4',
      name: 'Pelliculage A4 recto',
      category: 'pelliculage',
      type: 'Pelliculage',
      reference: 'fin-pelliculage',
      formatRef: 'A4',
      unit: 'face',
      unitPrice: P.pelliculageA4Recto,
      formulaType: 'per_face',
      rule: 'A5=/2 · A3=×2 · R/V=×2',
      details: 'Mat / Brillant / Soft touch',
    },
    {
      excelId: 'FIN-GAUFRAGE-A4',
      name: 'Gaufrage / Débossage A4',
      category: 'gaufrage',
      type: 'Gaufrage',
      reference: 'fin-gaufrage',
      formatRef: 'A4',
      unit: 'feuille',
      unitPrice: P.gaufrageA4,
      formulaType: 'per_sheet',
      rule: 'Prix feuille A4 — divisible carterie',
      details: 'Motif standard ; spécial = prix manuel',
    },
    {
      excelId: 'FIN-PERF-1',
      name: 'Perforation 1 trou',
      category: 'perforation',
      type: 'Perforation 1 trou',
      reference: 'fin-perforation:1',
      formatRef: null,
      unit: 'feuille',
      unitPrice: P.perforation1,
      formulaType: 'per_sheet',
      rule: '50 Ar',
      details: '',
    },
    {
      excelId: 'FIN-PERF-2',
      name: 'Perforation 2 trous',
      category: 'perforation',
      type: 'Perforation 2 trous',
      reference: 'fin-perforation:2',
      formatRef: null,
      unit: 'feuille',
      unitPrice: P.perforation2,
      formulaType: 'per_sheet',
      rule: '100 Ar',
      details: '',
    },
    {
      excelId: 'FIN-PERF-4',
      name: 'Perforation 4 trous',
      category: 'perforation',
      type: 'Perforation 4 trous',
      reference: 'fin-perforation:4',
      formatRef: null,
      unit: 'feuille',
      unitPrice: P.perforation4,
      formulaType: 'per_sheet',
      rule: '150 Ar',
      details: '',
    },
    {
      excelId: 'FIN-PERF-POINTILLE',
      name: 'Perforation pointillé / carnet A4',
      category: 'perforation',
      type: 'Perforation ligne pointillée',
      reference: 'fin-perforation:pointille',
      formatRef: 'A4',
      unit: 'feuille',
      unitPrice: P.perforationPointilleA4,
      formulaType: 'per_sheet',
      rule: '100 Ar / A4',
      details: '',
    },
    {
      excelId: 'FIN-PLASTI-A4',
      name: 'Plastification A4',
      category: 'plastification',
      type: 'Plastification',
      reference: 'fin-plastification',
      formatRef: 'A4',
      unit: 'feuille',
      unitPrice: P.plastificationA4,
      formulaType: 'per_sheet',
      rule: 'Recto = Recto-verso · A5=/2 · A3=×2',
      details: '',
    },
    {
      excelId: 'FIN-POSE-PETIT',
      name: 'Pose autocollant petit format',
      category: 'pose_autocollant',
      type: 'Pose petit format',
      reference: 'fin-autocollant:petit',
      formatRef: null,
      unit: 'pièce',
      unitPrice: P.posePetitFormat,
      formulaType: 'per_unit',
      rule: '300 Ar / pièce',
      details: '',
    },
    {
      excelId: 'FIN-POSE-GF-LE3',
      name: 'Pose autocollant GF ≤ 3 m',
      category: 'pose_autocollant',
      type: 'Pose vinyle grand format',
      reference: 'fin-autocollant:gf-le3',
      formatRef: null,
      unit: 'm²',
      unitPrice: P.poseGrandFormatLe3m,
      formulaType: 'per_m2',
      rule: 'hauteur ≤ 3 m → 10 000 Ar/m²',
      details: '',
    },
    {
      excelId: 'FIN-POSE-GF-GT3',
      name: 'Pose autocollant GF > 3 m',
      category: 'pose_autocollant',
      type: 'Pose vinyle grand format',
      reference: 'fin-autocollant:gf-gt3',
      formatRef: null,
      unit: 'm²',
      unitPrice: P.poseGrandFormatGt3m,
      formulaType: 'per_m2',
      rule: 'hauteur > 3 m → 20 000 Ar/m²',
      details: '',
    },
    {
      excelId: 'FIN-RAINAGE-PLI',
      name: 'Rainage / pliage 1 pli A4',
      category: 'rainage',
      type: 'Rainage / pliage',
      reference: 'fin-rainage',
      formatRef: 'A4',
      unit: 'pli',
      unitPrice: P.rainagePerPliA4,
      formulaType: 'per_unit',
      rule: 'nb plis × 50 × facteur format',
      details: '',
    },
    {
      excelId: 'FIN-VERNIS-A4',
      name: 'Vernis A4 recto',
      category: 'vernis',
      type: 'Vernis',
      reference: 'fin-vernis',
      formatRef: 'A4',
      unit: 'face',
      unitPrice: P.vernisA4Recto,
      formulaType: 'per_face',
      rule: 'A5=/2 · A3=×2 · A2=×4 · R/V=×2',
      details: '',
    },
    {
      excelId: 'FIN-AUTRES-MANUEL',
      name: 'Personnalisation libre',
      category: 'personnalisation',
      type: 'Personnalisation libre',
      reference: 'fin-autres',
      formatRef: null,
      unit: 'prestation',
      unitPrice: 0,
      formulaType: 'manual',
      rule: 'prix saisi POS / devis',
      details: 'Prix libre',
    },
  ];
}

/** Spirale — prix unifié PRIX 2026 (onglet RELIURE), fallback linéaire legacy. */
export function spiralPriceForMm(mm: number): number {
  const row = SPIRALES.find((s) => s.mm === mm);
  if (row) return row.px;
  const nearest = [...SPIRALES].sort(
    (a, b) => Math.abs(a.mm - mm) - Math.abs(b.mm - mm),
  )[0];
  if (nearest && Math.abs(nearest.mm - mm) <= 2) return nearest.px;
  const steps = Math.max(0, Math.round((mm - 6) / 2));
  return FINITION_BASE_PRICES.spiraleMinMm6 + steps * FINITION_BASE_PRICES.spiraleStep;
}
