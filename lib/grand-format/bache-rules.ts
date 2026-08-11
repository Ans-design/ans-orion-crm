/**
 * Moteur central bâche grand format — surfaces, laize, œillets, prix, stock.
 */

import { laizeLabelToM, parseLaizeMFromConfig } from '@/lib/grand-format/bache-laize';
import { BACHE_TYPE_DEFAULT_GRAMMAGE } from '@/lib/pos/bache-catalog';
import { DEFAULT_GF_ADMIN_PRICING, getGfAdminPricing } from '@/lib/grand-format/gf-admin-config';
import { eyeletsFromConfig, formatEyeletPositionsSummary } from '@/lib/grand-format/bache-eyelets';
import {
  parseBacheFinishings,
  priceBacheFinishings,
  type BacheFinishingLine,
  type BacheFinishingsRates,
} from '@/lib/grand-format/bache-finishings';
import {
  evaluateBestLaizeCandidate,
  getBacheAvailableLaizesCm,
  laizeChipToCm,
  cmToLaizeChipLabel,
  impressionAllowsRectoVerso,
} from '@/lib/print/grand-format-laize-rules';
import { computeGrandFormatDimensions } from '@/lib/pricing/format-dimensions';
import { shouldApplyGfLaizeRules } from '@/lib/grand-format/pricing';
import {
  parseGrandFormatDimensionsCm,
  cmToM,
  formatClientDimensionsCm,
} from '@/lib/dimensions/grand-format-units';

export { impressionAllowsRectoVerso };
export { computeEyelets, eyeletsFromConfig } from '@/lib/grand-format/bache-eyelets';

export const DEFAULT_WASTE_RATE = DEFAULT_GF_ADMIN_PRICING.wasteRate;
/** @deprecated Prefer getGfAdminPricing().eyeletUnitPriceAr — kept for imports UI. */
export const EYELET_UNIT_PRICE_AR = DEFAULT_GF_ADMIN_PRICING.eyeletUnitPriceAr;

export function getBacheFinishingOptions() {
  const p = getGfAdminPricing();
  return {
    coupe_simple: { label: 'Coupe simple', pricingMode: 'included' as const, price: 0 },
    oeillets: { label: 'Œillets', pricingMode: 'unit' as const, price: p.eyeletUnitPriceAr },
    ourlet: { label: 'Ourlet', pricingMode: 'linear' as const, pricePerLinearMeter: p.ourletPerMlAr },
    fourreau: { label: 'Fourreau', pricingMode: 'linear' as const, pricePerLinearMeter: p.fourreauPerMlAr },
    renfort: { label: 'Renfort', pricingMode: 'linear' as const, pricePerLinearMeter: p.renfortPerMlAr },
    raccord_soudure: {
      label: 'Raccord / soudure',
      pricingMode: 'manual_or_linear' as const,
      pricePerLinearMeter: p.raccordPerMlAr,
    },
    autres: { label: 'Autres', pricingMode: 'manual' as const, requiredDescription: true },
  };
}

/** Snapshot defaults (sans runtime) — compat imports existants. */
export const BACHE_FINISHING_OPTIONS = getBacheFinishingOptions();

export const BACHE_STOCK_ROLLS: Record<
  string,
  {
    label: string;
    type: string;
    grammage: string;
    laizeM: number;
    dos: string;
    aspect: string;
    longueurRouleauM: number;
    surfaceRouleauM2: number;
    stockDisponibleM2: number;
    unite: string;
  }
> = {
  bache_pvc_440_160_blanc_mat: {
    label: 'Bâche PVC',
    type: 'bache_pvc_standard',
    grammage: '440g',
    laizeM: 1.6,
    dos: 'blanc',
    aspect: 'mat',
    longueurRouleauM: 50,
    surfaceRouleauM2: 80,
    stockDisponibleM2: 80,
    unite: 'm²',
  },
  bache_pvc_440_240_blanc_mat: {
    label: 'Bâche PVC',
    type: 'bache_pvc_standard',
    grammage: '440g',
    laizeM: 2.4,
    dos: 'blanc',
    aspect: 'mat',
    longueurRouleauM: 50,
    surfaceRouleauM2: 120,
    stockDisponibleM2: 120,
    unite: 'm²',
  },
  mesh_270_160_blanc_mat: {
    label: 'Mesh micro-perforé',
    type: 'mesh',
    grammage: '270g',
    laizeM: 1.6,
    dos: 'blanc',
    aspect: 'mat',
    longueurRouleauM: 50,
    surfaceRouleauM2: 80,
    stockDisponibleM2: 80,
    unite: 'm²',
  },
  bache_pvc_440_320_blanc_mat: {
    label: 'Bâche PVC large',
    type: 'bache_pvc_standard',
    grammage: '440g',
    laizeM: 3.2,
    dos: 'blanc',
    aspect: 'mat',
    longueurRouleauM: 50,
    surfaceRouleauM2: 160,
    stockDisponibleM2: 160,
    unite: 'm²',
  },
};

const TYPE_COEFF: Record<string, number> = {
  'Bâche PVC standard': 1,
  'Bâche PVC renforcée': 1.12,
  'Mesh micro-perforé': 1.05,
  Autres: 1,
};

const GRAMMAGE_COEFF: Record<string, number> = {
  '270g': 0.95,
  '440g': 1,
  '510g': 1.08,
  '650g': 1.15,
};

const ASPECT_COEFF: Record<string, number> = {
  Mat: 1,
  Brillant: 1.05,
  Autres: 1,
};

export function computeBacheSurface(params: {
  longueurM: number;
  hauteurM: number;
  quantite: number;
}): { surfaceUnitaireM2: number; surfaceTotaleM2: number } {
  const surfaceUnitaire = params.longueurM * params.hauteurM;
  const surfaceTotale = surfaceUnitaire * params.quantite;
  return {
    surfaceUnitaireM2: Math.round(surfaceUnitaire * 100) / 100,
    surfaceTotaleM2: Math.round(surfaceTotale * 100) / 100,
  };
}

export function checkLaizeCompatibility(params: {
  longueurM: number;
  hauteurM: number;
  laizeM: number;
}): {
  compatible: boolean;
  assemblageRequired: boolean;
  orientation: 'normal' | 'rotation' | 'assemblage';
  message?: string;
} {
  const { longueurM, hauteurM, laizeM } = params;
  if (!laizeM || laizeM <= 0) {
    return { compatible: true, assemblageRequired: false, orientation: 'normal' };
  }
  const fitsNormal = hauteurM <= laizeM + 1e-6;
  const fitsRotated = longueurM <= laizeM + 1e-6;

  if (fitsNormal) {
    return {
      compatible: true,
      assemblageRequired: false,
      orientation: 'normal',
      message: 'Orientation normale.',
    };
  }
  if (fitsRotated) {
    return {
      compatible: true,
      assemblageRequired: false,
      orientation: 'rotation',
      message: 'Orientation : rotation sur rouleau.',
    };
  }
  return {
    compatible: false,
    assemblageRequired: true,
    orientation: 'assemblage',
    message: 'Dimension supérieure aux laizes disponibles — assemblage requis.',
  };
}

function dosKey(dos: string): string {
  return dos.replace(/^Dos\s+/i, '').toLowerCase();
}

export function resolveBacheStockKey(config: Record<string, unknown>): string | null {
  const type = String(config.type_bache ?? '');
  const grammage = String(config.grammage ?? '').replace(/\s/g, '');
  const laizeM = parseLaizeMFromConfig(config);
  const dos = dosKey(String(config.dos ?? 'Dos blanc'));
  const aspect = String(config.aspect ?? 'Mat').toLowerCase();

  for (const [key, roll] of Object.entries(BACHE_STOCK_ROLLS)) {
    const typeMatch =
      (type.includes('Mesh') && roll.type === 'mesh') ||
      (type.includes('PVC') && roll.type.startsWith('bache_pvc'));
    if (!typeMatch) continue;
    if (grammage && roll.grammage !== grammage) continue;
    if (laizeM != null && Math.abs(roll.laizeM - laizeM) > 0.05) continue;
    if (dos && roll.dos !== dos) continue;
    if (aspect && roll.aspect !== aspect) continue;
    return key;
  }
  return null;
}

export function getBacheDimensionsM(config: Record<string, unknown>): {
  longueurM: number;
  hauteurM: number;
} {
  const parsed = parseGrandFormatDimensionsCm(config);
  if (parsed) {
    return {
      longueurM: cmToM(parsed.longueurCm),
      hauteurM: cmToM(parsed.largeurCm),
    };
  }
  const gf = computeGrandFormatDimensions(config);
  if (gf?.largeur && gf.hauteur) {
    return { longueurM: cmToM(gf.largeur), hauteurM: cmToM(gf.hauteur) };
  }
  return { longueurM: 0, hauteurM: 0 };
}

export function getBacheDimensionsCm(config: Record<string, unknown>): {
  longueurCm: number;
  largeurCm: number;
} {
  const parsed = parseGrandFormatDimensionsCm(config);
  if (parsed) return parsed;
  const { longueurM, hauteurM } = getBacheDimensionsM(config);
  return {
    longueurCm: Math.round(longueurM * 100),
    largeurCm: Math.round(hauteurM * 100),
  };
}

export function grammagesForBacheType(typeBache: string): string[] {
  switch (typeBache) {
    case 'Mesh micro-perforé':
      return ['270g', 'Autres'];
    case 'Bâche PVC standard':
      return ['440g', '510g', 'Autres'];
    case 'Bâche PVC renforcée':
      return ['510g', '650g', 'Autres'];
    default:
      return ['270g', '440g', '510g', '650g', 'Autres'];
  }
}

export function defaultGrammageForType(typeBache: string): string | null {
  return BACHE_TYPE_DEFAULT_GRAMMAGE[typeBache] ?? null;
}

export interface BacheEvaluation {
  valid: boolean;
  surDevis: boolean;
  errors: string[];
  warnings: string[];
  summaryLines: string[];
  typeBache: string;
  grammage: string;
  laize: string;
  laizeM: number | null;
  recommendedLaize: string | null;
  dos: string;
  aspect: string;
  format: string;
  longueurM: number;
  hauteurM: number;
  longueurCm: number;
  largeurCm: number;
  surfaceUnitaireM2: number;
  surfaceTotaleM2: number;
  surfaceReelleM2: number;
  surfaceLaizeM2: number;
  surfaceFacturableM2: number;
  /** Largeur facturée (souvent = laize) en cm */
  billableWidthCm: number;
  /** Longueur facturée (autre côté) en cm */
  billableLengthCm: number;
  laizeUtiliseeCm: number | null;
  laizeRuleLabel: string | null;
  quantite: number;
  orientation: string;
  assemblageRequired: boolean;
  strips: number;
  eyeletCount: number;
  eyeletMode: string;
  eyeletTotalAr: number;
  finishingLines: BacheFinishingLine[];
  finishingTotalAr: number;
  stockKey: string | null;
  stockConsumedM2: number;
  stockAvailableM2: number | null;
  stockLowAfter: boolean;
  priceM2: number | null;
  automaticTotal: number | null;
  manualTotal: number | null;
  finalTotal: number | null;
  manualPriceApplied: boolean;
}

function resolveExplicitLaizeCm(config: Record<string, unknown>): number | null {
  const autre = parseFloat(String(config.laize_autre ?? ''));
  if (String(config.laize ?? '').toLowerCase().includes('autre') && autre > 0) return autre;
  const fromChip = laizeChipToCm(String(config.laize ?? ''));
  return fromChip;
}

export function evaluateBache(
  config: Record<string, unknown>,
  options?: {
    prixM2?: number | null;
    wasteRate?: number;
    adminPricing?: Partial<ReturnType<typeof getGfAdminPricing>>;
    finishingRates?: BacheFinishingsRates;
  },
): BacheEvaluation {
  const admin = { ...getGfAdminPricing(), ...(options?.adminPricing ?? {}) };
  const eyeletUnit = admin.eyeletUnitPriceAr;
  const finishingRates: BacheFinishingsRates = options?.finishingRates ?? {
    ourletPerMlAr: admin.ourletPerMlAr,
    fourreauPerMlAr: admin.fourreauPerMlAr,
    renfortPerMlAr: admin.renfortPerMlAr,
    raccordPerMlAr: admin.raccordPerMlAr,
  };
  const errors: string[] = [];
  const warnings: string[] = [];
  const summaryLines: string[] = [];

  const typeBache = String(config.type_bache ?? '').trim();
  const grammage = String(config.grammage ?? '').trim();
  const laize = String(config.laize ?? '').trim();
  const laizeM = parseLaizeMFromConfig(config);
  const dos = String(config.dos ?? '').trim();
  const aspect = String(config.aspect ?? '').trim();
  const format = String(config.format ?? '').trim();
  const quantite = Math.max(1, Number(config.qty ?? config.quantite ?? 1));
  const { longueurM, hauteurM } = getBacheDimensionsM(config);
  const longueurCm = Math.round(longueurM * 100);
  const largeurCm = Math.round(hauteurM * 100);

  const { surfaceUnitaireM2, surfaceTotaleM2 } = computeBacheSurface({
    longueurM,
    hauteurM,
    quantite,
  });

  const availableLaizesCm = getBacheAvailableLaizesCm(typeBache, grammage);
  const explicitLaizeCm = resolveExplicitLaizeCm(config);

  // Formats ISO A0–A5 : surface réelle uniquement — pas de règles de laize.
  const applyLaize = shouldApplyGfLaizeRules(config);
  const laizeEval =
    applyLaize && longueurCm > 0 && largeurCm > 0
      ? evaluateBestLaizeCandidate({
          longueurCm,
          largeurCm,
          availableLaizesCm,
          quantity: quantite,
          explicitLaizeCm,
        })
      : null;

  const candidate = laizeEval?.candidate;
  const surfaceReelleM2 = laizeEval?.surfaceReelleM2 ?? surfaceTotaleM2;
  const surfaceLaizeM2 = candidate?.surfaceLaizeM2 ?? 0;
  const surfaceFacturableM2 = candidate?.surfaceFacturableM2 ?? surfaceReelleM2;
  const billableWidthCm = candidate?.billableShortSideCm
    ?? (longueurCm > 0 && largeurCm > 0 ? Math.min(longueurCm, largeurCm) : 0);
  const billableLengthCm = candidate?.billableLongSideCm
    ?? (longueurCm > 0 && largeurCm > 0 ? Math.max(longueurCm, largeurCm) : 0);
  const laizeUtiliseeCm = candidate?.laizeCm ?? explicitLaizeCm ?? null;
  const laizeRuleLabel = candidate?.laizeRuleLabel ?? laizeEval?.ruleMessage ?? null;
  const recommendedLaize = laizeEval?.recommendedLaizeLabel ?? null;
  const orientation = candidate?.orientation ?? 'normal';
  const assemblageRequired = candidate?.assemblageRequired ?? false;
  const strips = candidate?.strips ?? 1;

  if (typeBache) summaryLines.push(`Type : ${typeBache}`);
  if (grammage) summaryLines.push(`Grammage : ${grammage}`);
  if (format) summaryLines.push(`Format : ${format.toLowerCase().includes('personnalis') ? 'personnalisé' : format}`);
  if (longueurCm > 0 && largeurCm > 0) {
    summaryLines.push(`Dimensions client : ${formatClientDimensionsCm(longueurCm, largeurCm)}`);
  }
  if (applyLaize && recommendedLaize && !laize) {
    summaryLines.push(`Laize recommandée : ${recommendedLaize}`);
  }
  if (applyLaize && laize) summaryLines.push(`Laize : ${laize}`);
  else if (applyLaize && explicitLaizeCm) summaryLines.push(`Laize : ${cmToLaizeChipLabel(explicitLaizeCm)}`);
  else if (!applyLaize && format) {
    summaryLines.push('Laize : non applicable (format ISO standard)');
  }  if (dos) summaryLines.push(`Dos : ${dos.replace(/^Dos\s+/i, '')}`);
  if (aspect) summaryLines.push(`Aspect : ${aspect}`);

  const face = String(config.face ?? 'Recto seul');
  summaryLines.push(`Impression : ${face}`);

  if (surfaceReelleM2 > 0) {
    summaryLines.push(`Surface réelle : ${surfaceReelleM2.toFixed(2)} m²`);
  }
  if (surfaceLaizeM2 > 0) {
    summaryLines.push(`Surface consommée laize : ${surfaceLaizeM2.toFixed(2)} m²`);
  }
  if (surfaceFacturableM2 > 0) {
    if (billableWidthCm > 0 && billableLengthCm > 0) {
      summaryLines.push(
        `Surface facturable : ${billableWidthCm} × ${billableLengthCm} cm ÷ 10 000 = ${surfaceFacturableM2.toFixed(2)} m²`,
      );
    } else {
      summaryLines.push(`Surface facturable : ${surfaceFacturableM2.toFixed(2)} m²`);
    }
  }
  if (laizeRuleLabel) summaryLines.push(`Règle appliquée : ${laizeRuleLabel}`);

  if (assemblageRequired) {
    warnings.push(`Assemblage requis — ${strips} bande(s).`);
  } else if (orientation === 'rotation') {
    summaryLines.push('Orientation : rotation');
  } else if (orientation === 'normal') {
    summaryLines.push('Orientation : normale');
  }

  const eyeletResult = eyeletsFromConfig(config, longueurM, hauteurM, eyeletUnit);
  const eyeletCount = eyeletResult.count;
  const eyeletTotalAr = eyeletResult.total;
  if (eyeletCount > 0) {
    summaryLines.push(`Œillets : ${eyeletResult.modeLabel}`);
    summaryLines.push(`Nombre d'œillets : ${eyeletCount}`);
    if (Array.isArray(eyeletResult.positions) && eyeletResult.positions.length > 0) {
      summaryLines.push(
        `Emplacements : ${formatEyeletPositionsSummary(eyeletResult.positions)}`,
      );
    }
    summaryLines.push(
      `Prix œillets : ${eyeletCount} × ${eyeletUnit.toLocaleString('fr-FR')} Ar = ${eyeletTotalAr.toLocaleString('fr-FR')} Ar`,
    );
  }

  const finishingSel = parseBacheFinishings(config);
  if (assemblageRequired && !finishingSel.raccord_soudure && !(finishingSel.raccordMeters && finishingSel.raccordMeters > 0)) {
    // Assemblage multi-bandes → suggérer raccord (longueur ≈ hauteur × (strips-1))
    const suggestM = Math.max(0, (strips - 1) * hauteurM);
    if (suggestM > 0) {
      finishingSel.raccord_soudure = true;
      finishingSel.raccordMeters = Math.round(suggestM * quantite * 1000) / 1000;
      warnings.push(`Raccord auto (assemblage ${strips} bandes) : ${finishingSel.raccordMeters} m linéaires.`);
    }
  }
  const finishing = priceBacheFinishings(finishingSel, longueurM, hauteurM, quantite, finishingRates);
  const finishingLines = finishing.lines;
  const finishingTotalAr = finishing.totalAr;
  for (const line of finishingLines) {
    summaryLines.push(
      `${line.label} : ${line.meters.toFixed(2)} m × ${line.unitPriceAr.toLocaleString('fr-FR')} Ar = ${line.totalAr.toLocaleString('fr-FR')} Ar`,
    );
  }

  summaryLines.push(`Quantité : ${quantite}`);

  const stockKey = resolveBacheStockKey(config);
  const wasteRate = options?.wasteRate ?? admin.wasteRate;
  const stockConsumedM2 =
    (surfaceLaizeM2 || surfaceReelleM2) > 0
      ? Math.round((surfaceLaizeM2 || surfaceReelleM2) * (1 + wasteRate) * 100) / 100
      : 0;
  const roll = stockKey ? BACHE_STOCK_ROLLS[stockKey] : null;
  const stockAvailableM2 = roll?.stockDisponibleM2 ?? null;
  let stockLowAfter = false;

  if (stockConsumedM2 > 0) {
    summaryLines.push(`Stock consommé estimé : ${stockConsumedM2.toFixed(2)} m²`);
  }
  if (stockAvailableM2 != null && stockConsumedM2 > stockAvailableM2) {
    warnings.push('Stock insuffisant pour cette configuration.');
  } else if (
    stockAvailableM2 != null &&
    stockConsumedM2 > 0 &&
    stockAvailableM2 - stockConsumedM2 < stockAvailableM2 * 0.15
  ) {
    warnings.push('Attention : stock faible après production.');
    stockLowAfter = true;
  }

  if (!impressionAllowsRectoVerso(dos) && face.toLowerCase().includes('verso')) {
    errors.push('Le recto-verso est disponible uniquement sur dos blanc.');
  }

  const manualTotal = parseFloat(String(config.prix_manuel ?? config.prixManuel ?? ''));
  const manualUnit = parseFloat(String(config.prix_unitaire_manuel ?? ''));
  const prixM2 = options?.prixM2 ?? null;

  const billableM2 = surfaceFacturableM2 > 0 ? surfaceFacturableM2 : surfaceReelleM2;

  let automaticTotal: number | null = null;
  if (billableM2 > 0 && prixM2 != null && prixM2 > 0) {
    const typeCoeff = TYPE_COEFF[typeBache] ?? 1;
    const grammageCoeff = GRAMMAGE_COEFF[grammage] ?? 1;
    const impressionCoeff = face.toLowerCase().includes('verso') ? 1.8 : 1;
    automaticTotal = Math.round(
      billableM2 * prixM2 * typeCoeff * grammageCoeff * impressionCoeff +
        eyeletTotalAr +
        finishingTotalAr,
    );
  }

  let finalTotal: number | null = automaticTotal;
  let manualPriceApplied = false;
  if (Number.isFinite(manualTotal) && manualTotal > 0) {
    finalTotal = Math.round(manualTotal);
    manualPriceApplied = true;
  } else if (Number.isFinite(manualUnit) && manualUnit > 0) {
    finalTotal = Math.round(manualUnit * quantite);
    manualPriceApplied = true;
  }

  const surDevis = !(finalTotal != null && finalTotal > 0);

  if (finalTotal != null && finalTotal > 0) {
    summaryLines.push(
      manualPriceApplied
        ? `Prix manuel appliqué : ${finalTotal.toLocaleString('fr-FR')} Ar`
        : `Prix estimé : ${finalTotal.toLocaleString('fr-FR')} Ar`,
    );
  } else {
    summaryLines.push('Prix sur devis — configuration bâche incomplete ou non chiffrable.');
  }

  return {
    valid: errors.length === 0,
    surDevis,
    errors,
    warnings,
    summaryLines,
    typeBache,
    grammage,
    laize,
    laizeM,
    recommendedLaize,
    dos,
    aspect,
    format,
    longueurM,
    hauteurM,
    longueurCm,
    largeurCm,
    surfaceUnitaireM2,
    surfaceTotaleM2,
    surfaceReelleM2,
    surfaceLaizeM2,
    surfaceFacturableM2,
    billableWidthCm,
    billableLengthCm,
    laizeUtiliseeCm,
    laizeRuleLabel,
    quantite,
    orientation,
    assemblageRequired,
    strips,
    eyeletCount,
    eyeletMode: eyeletResult.modeLabel,
    eyeletTotalAr,
    finishingLines,
    finishingTotalAr,
    stockKey,
    stockConsumedM2,
    stockAvailableM2,
    stockLowAfter,
    priceM2: prixM2,
    automaticTotal,
    manualTotal: Number.isFinite(manualTotal) ? manualTotal : null,
    finalTotal,
    manualPriceApplied,
  };
}

export function bacheCartSummaryLine(config: Record<string, unknown>): string | null {
  const ev = evaluateBache(config);
  if (!ev.typeBache && !ev.grammage) return null;
  const parts = ['Bâche'];
  if (ev.typeBache) parts.push(ev.typeBache.replace(/^Bâche\s+/i, ''));
  if (ev.grammage) parts.push(ev.grammage);
  if (ev.laize) parts.push(ev.laize);
  if (ev.dos) parts.push(ev.dos);
  if (ev.aspect) parts.push(ev.aspect);
  if (ev.longueurCm > 0 && ev.largeurCm > 0) {
    parts.push(formatClientDimensionsCm(ev.longueurCm, ev.largeurCm));
  }
  if (ev.surfaceReelleM2 > 0) {
    parts.push(`Surface réelle ${ev.surfaceReelleM2.toFixed(2)} m²`);
  }
  if (ev.surfaceLaizeM2 > 0 && ev.surfaceLaizeM2 !== ev.surfaceReelleM2) {
    parts.push(`Surface laize ${ev.surfaceLaizeM2.toFixed(2)} m²`);
  }
  if (ev.surfaceFacturableM2 > 0 && ev.surfaceFacturableM2 !== ev.surfaceReelleM2) {
    parts.push(`Surface facturable ${ev.surfaceFacturableM2.toFixed(2)} m²`);
  }
  const longueurM = ev.longueurCm / 100;
  const hauteurM = ev.largeurCm / 100;
  if (longueurM > 0 && hauteurM > 0) {
    const eyeletResult = eyeletsFromConfig(config, longueurM, hauteurM, EYELET_UNIT_PRICE_AR);
    if (eyeletResult.count > 0) {
      parts.push(`Œillets ${eyeletResult.count} (${eyeletResult.modeLabel})`);
    }
  }
  parts.push(`Qté ${ev.quantite}`);
  return parts.join(' — ');
}

/** @deprecated use eyeletsFromConfig */
export function computeEyeletsLegacy(params: {
  mode: string;
  surfaceTotaleM2: number;
  customCount?: number;
}): number {
  if (!params.mode || params.mode === 'Aucun') return 0;
  if (params.mode === 'Aux coins') return 4;
  if (params.mode === '4 œillets / m²') return Math.ceil(params.surfaceTotaleM2 * 4);
  if (params.mode === '8 œillets / m²') return Math.ceil(params.surfaceTotaleM2 * 8);
  if (params.mode === 'Nombre personnalisé') return Math.max(4, Number(params.customCount || 0));
  return 0;
}
