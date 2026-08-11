import type { StockRule } from '@prisma/client';
import { resolveCalendarMaterialRecap } from '@/lib/calendar/material-recap';
import { isCalendarArticleId } from '@/lib/calendar/calendar-material-policy';
import { resolvePackagingMaterialRecap } from '@/lib/packaging/material-recap';
import { resolveCustomSurfaceRecap } from '@/lib/pos/custom-surface-recap';
import { computeGrandFormatBillable } from '@/lib/grand-format/pricing';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';
import { loadGrandFormatStockProfile, resolveAvailableLaizesCm } from '@/lib/grand-format/stock-profile';
import { BACHE_CANONICAL_ID } from '@/lib/pos/bache-catalog';
import { evaluateBache } from '@/lib/grand-format/bache-rules';
import { bacheEvalToGfBillable } from '@/lib/grand-format/bache-bridge';

export type StockConsumptionResult = {
  consumable: boolean;
  unit: 'piece' | 'm2' | 'cm2';
  amount: number;
  grossAmount: number;
  materialKey: string | null;
  grammage: string | null;
  ruleType: string | null;
  pipeline: Record<string, unknown>;
};

function pickMaterialKey(config: Record<string, unknown>): string | null {
  for (const key of ['matiere', 'matiere_int', 'matiere_couv', 'paperType', 'type_bache', 'laize']) {
    const v = String(config[key] ?? '').trim();
    if (v) return v;
  }
  return null;
}

function pickGrammage(config: Record<string, unknown>): string | null {
  for (const key of ['grammage', 'grammage_int', 'grammage_couv', 'paperWeight']) {
    const v = String(config[key] ?? '').trim();
    if (v) return v;
  }
  return null;
}

function surfaceFromConfig(
  articleId: string,
  config: Record<string, unknown>,
  qty: number,
  source: string,
): { grossM2: number | null; grossCm2: number | null } {
  if (source === 'packaging_recap') {
    const recap = resolvePackagingMaterialRecap(articleId, config);
    if (recap) return { grossM2: null, grossCm2: recap.surfaceCm2 };
  }

  if (isCalendarArticleId(articleId)) {
    const cal = resolveCalendarMaterialRecap(articleId, config);
    if (cal) return { grossM2: cal.totalGrossSurfaceM2, grossCm2: null };
  }

  const custom = resolveCustomSurfaceRecap(articleId, config, qty);
  if (custom) return { grossM2: custom.totalGrossSurfaceM2, grossCm2: null };

  if (source === 'gf_billable' && isGrandFormatArticleId(articleId)) {
    if (articleId === BACHE_CANONICAL_ID) {
      const ev = evaluateBache(config);
      const billable = bacheEvalToGfBillable(ev, null);
      if (billable?.surfaceFactureeM2) {
        return { grossM2: billable.surfaceFactureeM2 * qty, grossCm2: null };
      }
    }
    return { grossM2: null, grossCm2: null };
  }

  return { grossM2: null, grossCm2: null };
}

export function evaluateStockConsumption(
  articleId: string,
  config: Record<string, unknown>,
  qty: number,
  stockRules: StockRule[],
  calculationType: string,
): StockConsumptionResult {
  const pipeline: Record<string, unknown> = { articleId, qty, calculationType };
  const materialKey = pickMaterialKey(config);
  const grammage = pickGrammage(config);

  const baseRule =
    stockRules.find((r) => r.ruleType === 'surface_consumption') ||
    stockRules.find((r) => r.ruleType === 'piece_consumption') ||
    stockRules.find((r) => r.ruleType === 'formula_consumption');

  if (baseRule?.ruleType === 'piece_consumption' || calculationType === 'piece') {
    return {
      consumable: qty > 0,
      unit: 'piece',
      amount: qty,
      grossAmount: qty,
      materialKey,
      grammage,
      ruleType: baseRule?.ruleType ?? 'piece_consumption',
      pipeline,
    };
  }

  const condition = (baseRule?.condition ?? {}) as Record<string, unknown>;
  const source = String(condition.source ?? 'surface_recap');
  const surfaces = surfaceFromConfig(articleId, config, qty, source);
  pipeline.surfaces = surfaces;

  if (condition.unit === 'cm2' && surfaces.grossCm2 != null) {
    const grossAmount = surfaces.grossCm2 * qty;
    return {
      consumable: grossAmount > 0,
      unit: 'cm2',
      amount: grossAmount,
      grossAmount,
      materialKey,
      grammage,
      ruleType: baseRule?.ruleType ?? 'surface_consumption',
      pipeline,
    };
  }

  if (surfaces.grossM2 != null && surfaces.grossM2 > 0) {
    return {
      consumable: true,
      unit: 'm2',
      amount: surfaces.grossM2,
      grossAmount: surfaces.grossM2,
      materialKey,
      grammage,
      ruleType: baseRule?.ruleType ?? 'surface_consumption',
      pipeline,
    };
  }

  if (isGrandFormatArticleId(articleId)) {
    return {
      consumable: qty > 0,
      unit: 'piece',
      amount: qty,
      grossAmount: qty,
      materialKey,
      grammage,
      ruleType: 'gf_fallback',
      pipeline,
    };
  }

  return {
    consumable: qty > 0,
    unit: 'piece',
    amount: qty,
    grossAmount: qty,
    materialKey,
    grammage,
    ruleType: baseRule?.ruleType ?? null,
    pipeline,
  };
}

/** Prévisualisation async GF (laize) pour consommation stock. */
export async function evaluateStockConsumptionAsync(
  articleId: string,
  config: Record<string, unknown>,
  qty: number,
  stockRules: StockRule[],
  calculationType: string,
): Promise<StockConsumptionResult> {
  const base = evaluateStockConsumption(articleId, config, qty, stockRules, calculationType);
  if (base.unit === 'm2' && base.grossAmount > 0) return base;
  if (!isGrandFormatArticleId(articleId)) return base;

  const profile = await loadGrandFormatStockProfile(articleId);
  if (!profile) return base;

  const productConfig = { prixM2: profile.prixA0 ?? profile.prixM2Fallback ?? undefined };
  const gf = computeGrandFormatBillable({
    config,
    availableLaizesCm: resolveAvailableLaizesCm(profile, articleId),
    prixM2: productConfig.prixM2 ?? null,
    stockKind: profile.stockKind,
  });

  if (gf.surfaceFactureeM2 && gf.surfaceFactureeM2 > 0) {
    const grossM2 = parseFloat((gf.surfaceFactureeM2 * qty).toFixed(6));
    return {
      ...base,
      consumable: true,
      unit: 'm2',
      amount: grossM2,
      grossAmount: grossM2,
      ruleType: 'surface_consumption',
      pipeline: { ...base.pipeline, gfBillable: gf },
    };
  }

  return base;
}
