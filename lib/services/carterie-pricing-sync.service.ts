/**
 * Sync Admin règles Carterie (SystemConfig) + alignement FinishingPrice.
 */
import { prisma } from '@/lib/prisma';
import {
  CARTERIE_PRICING_RULES_CONFIG_KEY,
  CARTERIE_IMPOSITION_EXCEL_COLUMNS,
  CARTERIE_REGLES_EXCEL_COLUMNS,
  DEFAULT_CARTERIE_RUNTIME_PARAMS,
  buildCanonicalCarterieImpositionRules,
  carterieImpositionToExcelRow,
  carteriePricingRuleToExcelRow,
  parseCarterieImpositionExcelRows,
  parseCarterieRulesExcelRows,
  getCarterieRuntimeParams,
  setCarterieRuntimeParams,
  type CarteriePricingRuntimeParams,
  type CarterieImpositionRule,
} from '@/lib/pricing/carterie-pricing-rules';
import { FINITION_BASE_PRICES } from '@/lib/finition/finition-price-catalog';

let ready = false;
let inflight: Promise<CarteriePricingRuntimeParams> | null = null;

export function invalidateCarteriePricingCache() {
  ready = false;
  inflight = null;
}

export { CARTERIE_IMPOSITION_EXCEL_COLUMNS, CARTERIE_REGLES_EXCEL_COLUMNS };

export async function ensureCarteriePricingRuntimeReady(): Promise<CarteriePricingRuntimeParams> {
  if (ready) return getCarterieRuntimeParams();
  if (inflight) return inflight;

  inflight = (async () => {
    const excelIds = ['FIN-PELLI-A4', 'FIN-GAUFRAGE-A4', 'FIN-COINS-50', 'FIN-DECOUPE-DROITE'];
    const references = ['fin-pelliculage', 'fin-gaufrage', 'fin-coins', 'fin-decoupe'];

    const [cfg, finishingRows] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { configKey: CARTERIE_PRICING_RULES_CONFIG_KEY } }).catch(() => null),
      prisma.finishingPrice
        .findMany({
          where: {
            active: true,
            OR: [{ excelId: { in: excelIds } }, { reference: { in: references } }],
          },
          orderBy: { updatedAt: 'desc' },
        })
        .catch(() => []),
    ]);

    const pick = (...keys: string[]) =>
      finishingRows.find(
        (r) => (r.excelId && keys.includes(r.excelId)) || (r.reference && keys.includes(r.reference)),
      );

    const pell = pick('FIN-PELLI-A4', 'fin-pelliculage');
    const gauf = pick('FIN-GAUFRAGE-A4', 'fin-gaufrage');
    const coins = pick('FIN-COINS-50', 'fin-coins');
    const decoupe = pick('FIN-DECOUPE-DROITE', 'fin-decoupe');

    const fromCfg = (cfg?.data ?? {}) as Partial<CarteriePricingRuntimeParams>;
    const legacyIsfOnly =
      fromCfg.sourcePrixBase === 'Impression sans finition'
      || fromCfg.sourcePrixBase === 'impression sans finition';
    setCarterieRuntimeParams({
      ...DEFAULT_CARTERIE_RUNTIME_PARAMS,
      ...fromCfg,
      // Migration : l’ancien libellé ISF ne doit plus bloquer la grille Excel commerciale
      sourcePrixBase: legacyIsfOnly
        ? DEFAULT_CARTERIE_RUNTIME_PARAMS.sourcePrixBase
        : (fromCfg.sourcePrixBase ?? DEFAULT_CARTERIE_RUNTIME_PARAMS.sourcePrixBase),
      formule: legacyIsfOnly
        ? DEFAULT_CARTERIE_RUNTIME_PARAMS.formule
        : (fromCfg.formule ?? DEFAULT_CARTERIE_RUNTIME_PARAMS.formule),
      commentaire: legacyIsfOnly
        ? DEFAULT_CARTERIE_RUNTIME_PARAMS.commentaire
        : (fromCfg.commentaire ?? DEFAULT_CARTERIE_RUNTIME_PARAMS.commentaire),
      impositionOverrides: {
        ...DEFAULT_CARTERIE_RUNTIME_PARAMS.impositionOverrides,
        ...(fromCfg.impositionOverrides ?? {}),
      },
      pelliculageA4:
        fromCfg.pelliculageA4 && fromCfg.pelliculageA4 > 0
          ? fromCfg.pelliculageA4
          : pell?.unitPrice && pell.unitPrice > 0
            ? Math.round(pell.unitPrice)
            : FINITION_BASE_PRICES.pelliculageA4Recto,
      gaufrageA4:
        fromCfg.gaufrageA4 && fromCfg.gaufrageA4 > 0
          ? fromCfg.gaufrageA4
          : gauf?.unitPrice && gauf.unitPrice > 0
            ? Math.round(gauf.unitPrice)
            : DEFAULT_CARTERIE_RUNTIME_PARAMS.gaufrageA4,
      coinsParFeuille:
        fromCfg.coinsParFeuille && fromCfg.coinsParFeuille > 0
          ? fromCfg.coinsParFeuille
          : coins?.unitPrice && coins.unitPrice > 0
            ? Math.round(coins.unitPrice)
            : FINITION_BASE_PRICES.coinsArrondisPerSheet,
      prixDecoupeParPiece:
        fromCfg.prixDecoupeParPiece && fromCfg.prixDecoupeParPiece > 0
          ? fromCfg.prixDecoupeParPiece
          : decoupe?.unitPrice && decoupe.unitPrice > 0
            ? Math.round(decoupe.unitPrice)
            : FINITION_BASE_PRICES.decoupeDroitePapier,
    });

    ready = true;
    return getCarterieRuntimeParams();
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

async function alignCarterieFinishing(params: CarteriePricingRuntimeParams) {
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
  await align(['FIN-PELLI-A4'], params.pelliculageA4);
  await align(['FIN-GAUFRAGE-A4'], params.gaufrageA4);
  await align(['FIN-COINS-50'], params.coinsParFeuille);
  await align(['FIN-DECOUPE-DROITE'], params.prixDecoupeParPiece);
}

async function persistParams(params: CarteriePricingRuntimeParams, userId?: string) {
  await prisma.systemConfig.upsert({
    where: { configKey: CARTERIE_PRICING_RULES_CONFIG_KEY },
    create: {
      configKey: CARTERIE_PRICING_RULES_CONFIG_KEY,
      data: params as object,
      updatedBy: userId ?? null,
    },
    update: {
      data: params as object,
      updatedBy: userId ?? null,
    },
  });

  await alignCarterieFinishing(params);

  invalidateCarteriePricingCache();
  setCarterieRuntimeParams(params);
  ready = true;
}

/** Sync POS : recharge DB + ré-aligne FinishingPrice. */
export async function forceSyncCarteriePricingRuntime(): Promise<CarteriePricingRuntimeParams> {
  invalidateCarteriePricingCache();
  const params = await ensureCarteriePricingRuntimeReady();
  await alignCarterieFinishing(params);
  const { forceSyncFinitionRuntimePrices } = await import(
    '@/lib/services/finition-runtime-sync.service'
  );
  await forceSyncFinitionRuntimePrices();
  return params;
}

export async function listCarterieImpositionRules(): Promise<CarterieImpositionRule[]> {
  await ensureCarteriePricingRuntimeReady();
  return buildCanonicalCarterieImpositionRules(getCarterieRuntimeParams());
}

export async function patchCarteriePricingParams(
  patch: Partial<CarteriePricingRuntimeParams>,
  opts?: { userId?: string },
): Promise<CarteriePricingRuntimeParams> {
  await ensureCarteriePricingRuntimeReady();
  const next = setCarterieRuntimeParams(patch);
  await persistParams(next, opts?.userId);
  return next;
}

export async function importCarterieFromExcel(
  payload: {
    impositionRows?: Record<string, unknown>[];
    rulesRows?: Record<string, unknown>[];
  },
  opts?: { userId?: string },
): Promise<{ updated: number }> {
  await ensureCarteriePricingRuntimeReady();
  const patch: Partial<CarteriePricingRuntimeParams> = {};
  if (payload.impositionRows?.length) {
    patch.impositionOverrides = {
      ...getCarterieRuntimeParams().impositionOverrides,
      ...parseCarterieImpositionExcelRows(payload.impositionRows),
    };
  }
  if (payload.rulesRows?.length) {
    Object.assign(patch, parseCarterieRulesExcelRows(payload.rulesRows));
  }
  await patchCarteriePricingParams(patch, opts);
  return { updated: 1 };
}

export function carterieExportExcelPayload() {
  const params = getCarterieRuntimeParams();
  const imposition = buildCanonicalCarterieImpositionRules(params).map(carterieImpositionToExcelRow);
  return {
    sheets: {
      '02_CARTERIE_FORMATS_IMPOSITION': imposition,
      '05_CARTERIE_REGLES_PRIX': [carteriePricingRuleToExcelRow(params)],
    },
    params,
    columns: {
      imposition: CARTERIE_IMPOSITION_EXCEL_COLUMNS,
      rules: CARTERIE_REGLES_EXCEL_COLUMNS,
    },
  };
}
