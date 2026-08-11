/**
 * Sync Admin règles publications (SystemConfig) + alignement FinishingPrice liées.
 */
import { prisma } from '@/lib/prisma';
import {
  PUBLICATION_PRICING_RULES_CONFIG_KEY,
  PUBLICATION_REGLES_EXCEL_COLUMNS,
  PUBLICATION_PALIERS_EXCEL_COLUMNS,
  DEFAULT_PUBLICATION_RUNTIME_PARAMS,
  getPublicationRuntimeParams,
  setPublicationRuntimeParams,
  publicationRuleToExcelRow,
  publicationVolumeTiersToExcelRows,
  parsePublicationRulesExcelRows,
  parsePublicationVolumeTiersExcelRows,
  type PublicationPricingRuntimeParams,
} from '@/lib/pricing/publication-pricing-rules';
import { forceSyncFinitionRuntimePrices } from '@/lib/services/finition-runtime-sync.service';

let ready = false;
let inflight: Promise<PublicationPricingRuntimeParams> | null = null;

export function invalidatePublicationPricingCache() {
  ready = false;
  inflight = null;
}

export { PUBLICATION_REGLES_EXCEL_COLUMNS, PUBLICATION_PALIERS_EXCEL_COLUMNS };

async function alignPublicationFinishing(params: PublicationPricingRuntimeParams) {
  const align = async (excelIds: string[], unitPrice: number) => {
    if (unitPrice <= 0) return;
    const row = await prisma.finishingPrice
      .findFirst({
        where: { OR: excelIds.map((excelId) => ({ excelId })) },
      })
      .catch(() => null);
    if (row) {
      await prisma.finishingPrice.update({ where: { id: row.id }, data: { unitPrice } });
    }
  };
  await align(['FIN-PELLI-A4'], params.pelliculageCouvertureA4);
  await align(['FIN-COINS-50'], params.coinsParExemplaire);
}

export async function ensurePublicationPricingRuntimeReady(): Promise<PublicationPricingRuntimeParams> {
  if (ready) return getPublicationRuntimeParams();
  if (inflight) return inflight;

  inflight = (async () => {
    const cfg = await prisma.systemConfig
      .findUnique({ where: { configKey: PUBLICATION_PRICING_RULES_CONFIG_KEY } })
      .catch(() => null);
    const fromCfg = (cfg?.data ?? {}) as Partial<PublicationPricingRuntimeParams>;
    setPublicationRuntimeParams({
      ...DEFAULT_PUBLICATION_RUNTIME_PARAMS,
      ...fromCfg,
      volumeTiers: fromCfg.volumeTiers ?? DEFAULT_PUBLICATION_RUNTIME_PARAMS.volumeTiers,
    });
    ready = true;
    return getPublicationRuntimeParams();
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** Sync POS : recharge DB + ré-aligne FinishingPrice pelliculage / coins. */
export async function forceSyncPublicationPricingRuntime(): Promise<PublicationPricingRuntimeParams> {
  invalidatePublicationPricingCache();
  const params = await ensurePublicationPricingRuntimeReady();
  await alignPublicationFinishing(params);
  await forceSyncFinitionRuntimePrices();
  return params;
}

async function persist(params: PublicationPricingRuntimeParams, userId?: string) {
  await prisma.systemConfig.upsert({
    where: { configKey: PUBLICATION_PRICING_RULES_CONFIG_KEY },
    create: {
      configKey: PUBLICATION_PRICING_RULES_CONFIG_KEY,
      data: params as object,
      updatedBy: userId ?? null,
    },
    update: {
      data: params as object,
      updatedBy: userId ?? null,
    },
  });
  await alignPublicationFinishing(params);
  invalidatePublicationPricingCache();
  setPublicationRuntimeParams(params);
  ready = true;
}

export async function patchPublicationPricingParams(
  patch: Partial<PublicationPricingRuntimeParams>,
  opts?: { userId?: string },
): Promise<PublicationPricingRuntimeParams> {
  await ensurePublicationPricingRuntimeReady();
  const next = setPublicationRuntimeParams(patch);
  await persist(next, opts?.userId);
  return next;
}

export async function importPublicationRulesFromExcel(
  payload: {
    rulesRows?: Record<string, unknown>[];
    paliersRows?: Record<string, unknown>[];
    /** @deprecated alias rulesRows */
    rows?: Record<string, unknown>[];
  },
  opts?: { userId?: string },
) {
  await ensurePublicationPricingRuntimeReady();
  const rulesRows = payload.rulesRows ?? payload.rows ?? [];
  const patch = parsePublicationRulesExcelRows(rulesRows);
  if (payload.paliersRows?.length) {
    const tiers = parsePublicationVolumeTiersExcelRows(payload.paliersRows);
    if (tiers.length) patch.volumeTiers = tiers;
  }
  await patchPublicationPricingParams(patch, opts);
  return {
    updated: 1,
    rows: rulesRows.length + (payload.paliersRows?.length ?? 0),
  };
}

export function publicationExportExcelPayload() {
  const params = getPublicationRuntimeParams();
  return {
    sheets: {
      '01_PUBLICATIONS_REGLES': [publicationRuleToExcelRow(params)],
      '02_PUBLICATIONS_PALIERS': publicationVolumeTiersToExcelRows(params),
    },
    params,
    columns: {
      rules: PUBLICATION_REGLES_EXCEL_COLUMNS,
      paliers: PUBLICATION_PALIERS_EXCEL_COLUMNS,
    },
  };
}
