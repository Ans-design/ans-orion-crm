/**
 * Grilles tarifaires PLV — archive structurelle (migration progressive → DB publiée).
 * Canon : Backoffice → DirectSale / MaterialContextPrice / GrandFormatPricing.
 * En STRICT / prod : getEffective* n’expose que les overrides runtime Admin (jamais les constantes seules).
 */

export type PlvPriceTier = { max: number; rate: number };

/** Remises volume PLV — taux (pas monétaire) : restent utilisables hors STRICT money. */
export const PLV_VOLUME_REMISES: PlvPriceTier[] = [
  { max: 9, rate: 0 },
  { max: 24, rate: 0.05 },
  { max: 49, rate: 0.08 },
  { max: 99, rate: 0.12 },
  { max: 249, rate: 0.15 },
  { max: Infinity, rate: 0.18 },
];

/** Marge commerciale PLV (multiplicateur — pas un montant Ar). */
export const PLV_COMMERCIAL_MARGIN = 1.28;

/** Minimum de production — quantité facturée au minimum si inférieure. */
export const PLV_MIN_PRODUCTION_QTY = 1;

/** Impression numérique PLV — Ar / m² surface brute (quadri). Archive. */
export const PLV_PRINT_RATE_M2_AR = 48_000;

/** Impression N&B / simple face — coefficient. */
export const PLV_PRINT_NB_COEFF = 0.55;

/** Chute matière — mm par côté (surface brute). Dimension, pas Ar. */
export const PLV_WASTE_MARGIN_MM = 50;

/** Prix découpe / façonnage de base par pièce (Ar). Archive. */
export const PLV_CUTTING_BASE_AR = 4_500;

/** Prix finition (pelliculage / vernis) par m² (Ar). Archive. */
export const PLV_FINISHING_M2_AR = 12_000;

/** Prix structure / montage de base par famille article (Ar). Archive. */
export const PLV_ARTICLE_STRUCTURE_BASE_AR: Record<string, number> = {
  'plv-chevalet': 18_000,
  'plv-porte-affiches': 22_000,
  'plv-porte-flyers': 15_000,
  'plv-presentoir-sol': 35_000,
  'plv-presentoir-magasin': 45_000,
  'plv-rollup': 85_000,
  'plv-xbanner': 42_000,
  'plv-oriflamme': 120_000,
};

/** Coût structure additionnel par type (Ar). Archive. */
export const PLV_TYPE_SUPPLEMENT_AR: Record<string, number> = {
  'Chevalet de table': 0,
  'Chevalet carton stop-rayon': 8_000,
  'Chevalet PVC': 12_000,
  'Stop-trottoir A': 15_000,
  'Stop-trottoir cadre clippant': 18_000,
  'Stop-trottoir à ressort': 22_000,
  'Totem de sol': 28_000,
  'Porte-affiche mural': 5_000,
  'Porte-affiche sur pied': 12_000,
  'Fronton + étagères': 25_000,
  'Cadre clippant': 8_000,
  'Colonne tournante': 20_000,
  'Box palette / Bac de sol': 30_000,
  'Comptoir / Escalier': 10_000,
};

/** Tarif matière PLV — Ar / m² (surface brute). Archive. */
export const PLV_MATERIAL_RATE_M2_AR: Record<string, number> = {
  'Carton ondulé': 18_000,
  'Carton compact': 22_000,
  'PVC rigide': 38_000,
  'PVC 20 mm': 95_000,
  'Plexiglass': 52_000,
  'Forex': 35_000,
  'Métal': 48_000,
  'Tôle acier métallique local': 55_000,
  'Tôle / acier métallique local': 55_000,
  'Dibond / Alu': 62_000,
  'Vinyle': 28_000,
  'Bâche': 24_000,
  'Mixte': 40_000,
  'PP film indéchirable': 20_000,
};

function isStrictPlvRuntime(): boolean {
  // Bypass local explicite (même si NODE_ENV=production pour `next start` E2E)
  const app = (process.env.APP_ENV || '').toLowerCase();
  if (app === 'local' || process.env.LOCAL_DEV === 'true') {
    return process.env.STRICT_POS_PRICING === '1' || process.env.STRICT_POS_PRICING === 'true';
  }
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
    || app === 'ci'
    || app === 'production'
    || app === 'prod'
  );
}

export type PlvRuntimeTariffOverrides = {
  printRateM2Ar?: number;
  cuttingBaseAr?: number;
  finishingM2Ar?: number;
  commercialMargin?: number;
  materialRateM2Ar?: Record<string, number>;
  articleStructureBaseAr?: Record<string, number>;
  typeSupplementAr?: Record<string, number>;
};

let runtimeOverrides: PlvRuntimeTariffOverrides = {};

export function setPlvRuntimeTariffOverrides(patch: PlvRuntimeTariffOverrides | null) {
  if (!patch) {
    runtimeOverrides = {};
    return;
  }
  runtimeOverrides = { ...runtimeOverrides, ...patch };
  if (patch.materialRateM2Ar) {
    runtimeOverrides.materialRateM2Ar = {
      ...(runtimeOverrides.materialRateM2Ar ?? {}),
      ...patch.materialRateM2Ar,
    };
  }
  if (patch.articleStructureBaseAr) {
    runtimeOverrides.articleStructureBaseAr = {
      ...(runtimeOverrides.articleStructureBaseAr ?? {}),
      ...patch.articleStructureBaseAr,
    };
  }
  if (patch.typeSupplementAr) {
    runtimeOverrides.typeSupplementAr = {
      ...(runtimeOverrides.typeSupplementAr ?? {}),
      ...patch.typeSupplementAr,
    };
  }
}

export function resetPlvRuntimeTariffOverrides() {
  runtimeOverrides = {};
}

export function hasPlvRuntimeTariffOverrides(): boolean {
  return Object.keys(runtimeOverrides).length > 0;
}

/** Tarifs monétaires effectifs — zéro hardcode en STRICT sans override Admin/DB. */
export function getEffectivePlvPrintRateM2Ar(): number {
  if (runtimeOverrides.printRateM2Ar != null && runtimeOverrides.printRateM2Ar > 0) {
    return Math.round(runtimeOverrides.printRateM2Ar);
  }
  return isStrictPlvRuntime() ? 0 : PLV_PRINT_RATE_M2_AR;
}

export function getEffectivePlvCuttingBaseAr(): number {
  if (runtimeOverrides.cuttingBaseAr != null && runtimeOverrides.cuttingBaseAr > 0) {
    return Math.round(runtimeOverrides.cuttingBaseAr);
  }
  return isStrictPlvRuntime() ? 0 : PLV_CUTTING_BASE_AR;
}

export function getEffectivePlvFinishingM2Ar(): number {
  if (runtimeOverrides.finishingM2Ar != null && runtimeOverrides.finishingM2Ar > 0) {
    return Math.round(runtimeOverrides.finishingM2Ar);
  }
  return isStrictPlvRuntime() ? 0 : PLV_FINISHING_M2_AR;
}

export function getEffectivePlvCommercialMargin(): number {
  if (runtimeOverrides.commercialMargin != null && runtimeOverrides.commercialMargin > 0) {
    return runtimeOverrides.commercialMargin;
  }
  // Multiplicateur structurel — conservé même en STRICT (pas un montant inventé)
  return PLV_COMMERCIAL_MARGIN;
}

export function getEffectivePlvMaterialRateM2Ar(label: string): number {
  const key = String(label ?? '').trim();
  const ov = runtimeOverrides.materialRateM2Ar;
  if (ov) {
    const direct = ov[key];
    if (direct != null && direct > 0) return Math.round(direct);
    const found = Object.entries(ov).find(([k]) => k.toLowerCase() === key.toLowerCase());
    if (found?.[1] != null && found[1] > 0) return Math.round(found[1]);
  }
  if (isStrictPlvRuntime()) return 0;
  const direct = PLV_MATERIAL_RATE_M2_AR[key];
  if (direct != null) return direct;
  const found = Object.entries(PLV_MATERIAL_RATE_M2_AR).find(
    ([k]) => k.toLowerCase() === key.toLowerCase(),
  );
  return found?.[1] ?? 30_000;
}

export function getEffectivePlvStructureBaseAr(canonicalArticleId: string): number {
  const ov = runtimeOverrides.articleStructureBaseAr?.[canonicalArticleId];
  if (ov != null && ov > 0) return Math.round(ov);
  if (isStrictPlvRuntime()) return 0;
  return PLV_ARTICLE_STRUCTURE_BASE_AR[canonicalArticleId] ?? 20_000;
}

export function getEffectivePlvTypeSupplementAr(typeKey: string): number {
  const ov = runtimeOverrides.typeSupplementAr?.[typeKey];
  if (ov != null && ov >= 0) return Math.round(ov);
  if (isStrictPlvRuntime()) return 0;
  return PLV_TYPE_SUPPLEMENT_AR[typeKey] ?? 0;
}

/** Multiplicateur épaisseur / grammage support. */
export function plvThicknessFactor(epaisseurRaw: string): number {
  const s = String(epaisseurRaw ?? '').toLowerCase();
  if (/20\s*mm/.test(s)) return 2.4;
  if (/10\s*mm/.test(s)) return 1.45;
  if (/8\s*mm/.test(s)) return 1.25;
  if (/5\s*mm/.test(s)) return 1.12;
  if (/3\s*mm/.test(s)) return 1.0;
  if (/2\s*mm/.test(s)) return 0.95;
  if (/1[,.]5\s*mm/.test(s)) return 0.9;
  if (/1\s*mm/.test(s)) return 0.85;
  if (/750g|750\s*g/.test(s)) return 1.1;
  if (/510g|510\s*g/.test(s)) return 1.05;
  if (/440g|440\s*g/.test(s)) return 1.0;
  if (/eb double|4\s*mm/.test(s)) return 1.08;
  if (/b flute|3\s*mm/.test(s)) return 1.0;
  if (/e flute|1[,.]5/.test(s)) return 0.88;
  return 1;
}

export function plvVolumeRemiseRate(qty: number): number {
  const q = Math.max(1, Math.floor(qty));
  for (const tier of PLV_VOLUME_REMISES) {
    if (q <= tier.max) return tier.rate;
  }
  return 0;
}
