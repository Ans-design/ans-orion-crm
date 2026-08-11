import { resolvePlvCanonicalId } from '@/lib/pos/plv-catalog';
import { getOriflammeSpec, parseOriflammeVoileHeightCm, parseOriflammeVoileWidthCm } from '@/lib/data/oriflamme-catalog';
import { resolvePresentoirDimensionsMm } from '@/lib/data/plv-presentoir-catalog';
import { formatChipSortArea } from '@/lib/pos/format-chip-sort';
import { isRectoVerso } from '@/lib/pricing/config-normalize';
import {
  PLV_MIN_PRODUCTION_QTY,
  PLV_PRINT_NB_COEFF,
  PLV_WASTE_MARGIN_MM,
  getEffectivePlvCommercialMargin,
  getEffectivePlvCuttingBaseAr,
  getEffectivePlvFinishingM2Ar,
  getEffectivePlvMaterialRateM2Ar,
  getEffectivePlvPrintRateM2Ar,
  getEffectivePlvStructureBaseAr,
  getEffectivePlvTypeSupplementAr,
  plvThicknessFactor,
  plvVolumeRemiseRate,
} from '@/lib/data/plv-tariffs';
import { resolvePlvDirectSaleFlatPrice } from '@/lib/pricing/plv-direct-sale-runtime';

export type PlvPriceBreakdown = {
  prixMatiere: number;
  prixImpression: number;
  prixFinition: number;
  prixFaçonnage: number;
  prixStructure: number;
};

export type PlvPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  breakdown?: PlvPriceBreakdown;
  grossSurfaceM2?: number;
  formula?: string;
};

const PERSONALIZED_MARKERS = ['personnalis', 'sur mesure'];

function isPlvArticleId(articleId: string): boolean {
  return articleId.startsWith('plv-') || articleId === 'plv';
}

export function resolvePlvPricingArticleId(articleId: string): string {
  if (articleId === 'plv') return 'plv-chevalet';
  return resolvePlvCanonicalId(articleId);
}

export function isPlvPricingArticle(articleId: string): boolean {
  return isPlvArticleId(articleId);
}

function isPersonalizedOnly(config: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((k) => {
    const v = String(config[k] ?? '').toLowerCase();
    return PERSONALIZED_MARKERS.some((m) => v.includes(m));
  });
}

function parseFormatSurfaceM2(format: string): number | null {
  const area = formatChipSortArea(format);
  if (area == null) return null;
  return parseFloat((area / 1_000_000).toFixed(6));
}

function parseCustomPanelM2(config: Record<string, unknown>): number | null {
  const w = Number(config.longueur ?? config.largeur_mm ?? config.largeur);
  const h = Number(config.largeur ?? config.hauteur_mm ?? config.hauteur);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return parseFloat(((w * h) / 1_000_000).toFixed(6));
}

function withGrossMargin(realM2: number): number {
  const side = Math.sqrt(realM2 * 1_000_000);
  const gross = ((side + 100 + PLV_WASTE_MARGIN_MM * 2) ** 2) / 1_000_000;
  return parseFloat(gross.toFixed(6));
}

function resolveGrossSurfaceM2(articleId: string, config: Record<string, unknown>): number | null {
  const canonical = resolvePlvPricingArticleId(articleId);

  if (canonical === 'plv-oriflamme') {
    const spec = getOriflammeSpec(String(config.type ?? ''), String(config.hauteur ?? ''));
    if (!spec) return null;
    const wCm = parseOriflammeVoileWidthCm(spec.voile);
    const hCm = parseOriflammeVoileHeightCm(spec.voile);
    if (wCm <= 0 || hCm <= 0) return null;
    const realM2 = (wCm * hCm) / 10_000;
    const faceMult = /double/i.test(String(config.face ?? '')) ? 2 : 1;
    return withGrossMargin(realM2 * faceMult);
  }

  if (canonical === 'plv-presentoir-magasin') {
    const dims = resolvePresentoirDimensionsMm(config);
    if (!dims) return null;
    return withGrossMargin(dims.developpeM2);
  }

  const format = String(config.format ?? '');
  if (/personnalis/i.test(format)) {
    const custom = parseCustomPanelM2(config);
    return custom != null ? withGrossMargin(custom) : null;
  }

  const fromFormat = parseFormatSurfaceM2(format);
  if (fromFormat != null) {
    let m2 = fromFormat;
    if (canonical === 'plv-presentoir-sol' && /double/i.test(String(config.face ?? ''))) {
      m2 *= 2;
    }
    if (canonical === 'plv-chevalet' && isRectoVerso(config.face)) {
      m2 *= 2;
    }
    return withGrossMargin(m2);
  }

  if (/^\d+×\d+\s*cm$/i.test(format.trim())) {
    const m = format.match(/(\d+)\s*×\s*(\d+)\s*cm/i);
    if (m) {
      const w = Number(m[1]) * 10;
      const h = Number(m[2]) * 10;
      return withGrossMargin((w * h) / 1_000_000);
    }
  }

  return null;
}

function resolveMaterialLabel(config: Record<string, unknown>): string {
  return String(
    config.matiere ?? config.tissu ?? config.support ?? config.structure ?? 'Carton ondulé',
  ).trim();
}

function materialRate(label: string): number {
  return getEffectivePlvMaterialRateM2Ar(label);
}

function facePrintCoeff(config: Record<string, unknown>): number {
  const face = String(config.face ?? '');
  const isDouble = /double/i.test(face) || isRectoVerso(face);
  if (isDouble) return 1.75;
  if (/n&b|noir|nb/i.test(String(config.impression ?? config.couleur ?? ''))) {
    return PLV_PRINT_NB_COEFF;
  }
  return 1;
}

function finitionSelected(config: Record<string, unknown>): boolean {
  const f = String(config.finition ?? config.finition_pelliculage ?? config.finition_surface ?? '');
  return Boolean(f) && !/sans/i.test(f);
}

export function computePlvPrice(
  articleId: string,
  config: Record<string, unknown>,
  qty = 1,
): PlvPriceResult {
  const canonical = resolvePlvPricingArticleId(articleId);
  if (!isPlvArticleId(canonical)) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'not_plv' };
  }

  // Prix pièce DirectSale (Roll-up / X-Banner AVD*) — source de vérité backoffice
  const dsFlat = resolvePlvDirectSaleFlatPrice(canonical, config);
  if (dsFlat && dsFlat.unitPrice > 0) {
    const billableQty = Math.max(PLV_MIN_PRODUCTION_QTY, Math.floor(qty));
    const remise = plvVolumeRemiseRate(billableQty);
    const prixUnitaire = Math.round(dsFlat.unitPrice * (1 - remise));
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire,
      formula: `plv|directSale|${dsFlat.sourceRef}|${canonical}`,
      breakdown: {
        prixMatiere: 0,
        prixImpression: 0,
        prixFinition: 0,
        prixFaçonnage: 0,
        prixStructure: dsFlat.unitPrice,
      },
    };
  }

  const grossM2 = resolveGrossSurfaceM2(canonical, config);
  if (grossM2 == null || grossM2 <= 0) {
    if (isPersonalizedOnly(config, ['type', 'format', 'matiere'])) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'incomplete_custom' };
    }
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'incomplete_dims' };
  }

  const matiere = resolveMaterialLabel(config);
  if (/matière personnalisée/i.test(matiere) && !config.epaisseur) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'matiere_custom' };
  }

  const thickness = plvThicknessFactor(String(config.epaisseur ?? config.grammage ?? ''));
  const matRate = materialRate(matiere) * thickness;
  const printRate = getEffectivePlvPrintRateM2Ar();
  const finishingRate = getEffectivePlvFinishingM2Ar();
  const cuttingBase = getEffectivePlvCuttingBaseAr();
  const margin = getEffectivePlvCommercialMargin();

  // STRICT sans overrides Admin/DB → pas de calcul inventé (DirectSale flat déjà traité plus haut)
  if (printRate <= 0 && matRate <= 0 && cuttingBase <= 0) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'plv_tariffs_not_configured' };
  }

  const prixMatiere = Math.round(grossM2 * matRate);
  const prixImpression = Math.round(grossM2 * printRate * facePrintCoeff(config));
  const prixFinition = finitionSelected(config)
    ? Math.round(grossM2 * finishingRate)
    : 0;
  const prixFaçonnage = cuttingBase
    + (cuttingBase > 0 && /oui/i.test(String(config.rainage ?? '')) ? 3_000 : 0)
    + (cuttingBase > 0 && /oui/i.test(String(config.collage ?? '')) ? 2_500 : 0);

  const typeKey = String(config.type ?? '');
  const skipTypeSupplement = canonical === 'plv-chevalet' || canonical === 'plv-oriflamme';
  const prixStructure =
    getEffectivePlvStructureBaseAr(canonical)
    + (skipTypeSupplement ? 0 : getEffectivePlvTypeSupplementAr(typeKey));

  let subtotal =
    prixMatiere + prixImpression + prixFinition + prixFaçonnage + prixStructure;
  subtotal = Math.round(subtotal * margin);

  const billableQty = Math.max(PLV_MIN_PRODUCTION_QTY, Math.floor(qty));
  const remise = plvVolumeRemiseRate(billableQty);
  const prixUnitaire = Math.round(subtotal * (1 - remise));

  return {
    calculable: prixUnitaire > 0,
    surDevis: prixUnitaire <= 0,
    prixUnitaire,
    grossSurfaceM2: grossM2,
    breakdown: {
      prixMatiere,
      prixImpression,
      prixFinition,
      prixFaçonnage,
      prixStructure,
    },
    formula: `plv|${canonical}|${grossM2}m²|marge×${margin}`,
  };
}

export { plvVolumeRemiseRate };
