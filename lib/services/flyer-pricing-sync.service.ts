/**
 * Sync Admin règles Flyer (SystemConfig) + alignement prix pli rainage FinishingPrice.
 */
import { prisma } from '@/lib/prisma';
import {
  FLYER_PRICING_RULES_CONFIG_KEY,
  FLYER_REGLES_EXCEL_COLUMNS,
  DEFAULT_FLYER_RUNTIME_PARAMS,
  buildCanonicalFlyerPricingRules,
  flyerRuleToExcelRow,
  parseFlyerRulesExcelRows,
  getFlyerRuntimeParams,
  setFlyerRuntimeParams,
  type FlyerPricingRuntimeParams,
  type FlyerPricingRuleRow,
} from '@/lib/pricing/flyer-pricing-rules';
import { FINITION_BASE_PRICES } from '@/lib/finition/finition-price-catalog';
import { forceSyncFinitionRuntimePrices } from '@/lib/services/finition-runtime-sync.service';

let ready = false;
let inflight: Promise<FlyerPricingRuntimeParams> | null = null;

export function invalidateFlyerPricingCache() {
  ready = false;
  inflight = null;
}

export { FLYER_REGLES_EXCEL_COLUMNS };

async function alignRainageFinishing(prixPliA4: number) {
  if (prixPliA4 <= 0) return;
  const rainage = await prisma.finishingPrice
    .findFirst({
      where: { OR: [{ excelId: 'FIN-RAINAGE-PLI' }, { reference: 'fin-rainage' }] },
    })
    .catch(() => null);
  if (rainage) {
    await prisma.finishingPrice.update({
      where: { id: rainage.id },
      data: { unitPrice: prixPliA4 },
    });
  }
}

export async function ensureFlyerPricingRuntimeReady(): Promise<FlyerPricingRuntimeParams> {
  if (ready) return getFlyerRuntimeParams();
  if (inflight) return inflight;

  inflight = (async () => {
    const [cfg, rainage] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { configKey: FLYER_PRICING_RULES_CONFIG_KEY } }).catch(() => null),
      prisma.finishingPrice
        .findFirst({
          where: {
            OR: [{ excelId: 'FIN-RAINAGE-PLI' }, { reference: 'fin-rainage' }, { name: { contains: 'Rainage' } }],
            active: true,
          },
          orderBy: { updatedAt: 'desc' },
        })
        .catch(() => null),
    ]);

    const fromCfg = (cfg?.data ?? {}) as Partial<FlyerPricingRuntimeParams>;
    const prixFromRainage =
      rainage?.unitPrice != null && rainage.unitPrice > 0 ? Math.round(rainage.unitPrice) : null;

    setFlyerRuntimeParams({
      ...DEFAULT_FLYER_RUNTIME_PARAMS,
      ...fromCfg,
      prixPliA4:
        fromCfg.prixPliA4 && fromCfg.prixPliA4 > 0
          ? fromCfg.prixPliA4
          : prixFromRainage ?? FINITION_BASE_PRICES.rainagePerPliA4,
    });

    ready = true;
    return getFlyerRuntimeParams();
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** Sync POS : recharge DB + ré-aligne FinishingPrice (pas de no-op si déjà ready). */
export async function forceSyncFlyerPricingRuntime(): Promise<FlyerPricingRuntimeParams> {
  invalidateFlyerPricingCache();
  const params = await ensureFlyerPricingRuntimeReady();
  await alignRainageFinishing(params.prixPliA4);
  await forceSyncFinitionRuntimePrices();
  return params;
}

async function persistParams(params: FlyerPricingRuntimeParams, userId?: string) {
  await prisma.systemConfig.upsert({
    where: { configKey: FLYER_PRICING_RULES_CONFIG_KEY },
    create: {
      configKey: FLYER_PRICING_RULES_CONFIG_KEY,
      data: params as object,
      updatedBy: userId ?? null,
    },
    update: {
      data: params as object,
      updatedBy: userId ?? null,
    },
  });

  await alignRainageFinishing(params.prixPliA4);

  invalidateFlyerPricingCache();
  setFlyerRuntimeParams(params);
  ready = true;
}

export async function listFlyerPricingRules(): Promise<FlyerPricingRuleRow[]> {
  await ensureFlyerPricingRuntimeReady();
  return buildCanonicalFlyerPricingRules(getFlyerRuntimeParams());
}

export async function patchFlyerPricingParams(
  patch: Partial<FlyerPricingRuntimeParams>,
  opts?: { userId?: string },
): Promise<FlyerPricingRuntimeParams> {
  await ensureFlyerPricingRuntimeReady();
  const next = setFlyerRuntimeParams(patch);
  await persistParams(next, opts?.userId);
  return next;
}

export async function importFlyerRulesFromExcel(
  rows: Record<string, unknown>[],
  opts?: { userId?: string },
): Promise<{ updated: number; rows: number }> {
  await ensureFlyerPricingRuntimeReady();
  const parsed = parseFlyerRulesExcelRows(rows);
  await patchFlyerPricingParams(parsed, opts);
  return { updated: 1, rows: rows.length };
}

export function flyerRulesToExcelRows(rows: FlyerPricingRuleRow[]) {
  return rows.map(flyerRuleToExcelRow);
}
