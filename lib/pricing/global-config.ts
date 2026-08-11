import { prisma } from '@/lib/prisma';
import { DEFAULT_GLOBAL_PRICING, type GlobalPricingConfig } from '@/lib/data/global-pricing';
import {
  DEFAULT_FACE_RECTO_VERSO_MULT,
  DEFAULT_FINITION_SURCHARGE_PCT,
} from '@/lib/pricing/pricing-defaults';

export {
  DEFAULT_FACE_RECTO_VERSO_MULT,
  DEFAULT_FINITION_SURCHARGE_PCT,
} from '@/lib/pricing/pricing-defaults';

const CONFIG_KEY = 'global_pricing';

/** Codes PricingVariable → champs GlobalPricingConfig (Lot 3 P0). */
export const GLOBAL_PRICING_VARIABLE_CODES = [
  'tva_default',
  'production_standard',
  'production_express48h',
  'production_super24h',
  'bat_physique_papier',
  'livraison_tana',
  'livraison_province',
] as const;

export type GlobalPricingVariableCode = (typeof GLOBAL_PRICING_VARIABLE_CODES)[number];

export type PricingVariableLike = {
  code: string;
  value: string;
  active?: boolean;
};

/**
 * Merge order layer 3: active PricingVariable codes override `base`
 * (already DEFAULT ← systemConfig).
 */
export function mergePricingVariablesIntoGlobalConfig(
  base: GlobalPricingConfig,
  vars: PricingVariableLike[],
): GlobalPricingConfig {
  const out: GlobalPricingConfig = {
    production: { ...base.production },
    bat: { ...base.bat },
    livraison: { ...base.livraison },
    tvaDefault: base.tvaDefault,
  };

  const byCode = new Map<string, string>();
  for (const v of vars) {
    if (v.active === false) continue;
    byCode.set(v.code, v.value);
  }

  const num = (code: string): number | null => {
    const raw = byCode.get(code);
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const tva = num('tva_default');
  if (tva != null) out.tvaDefault = tva;

  const ps = num('production_standard');
  if (ps != null) out.production.standard = ps;
  const pe = num('production_express48h');
  if (pe != null) out.production.express48h = pe;
  const p24 = num('production_super24h');
  if (p24 != null) out.production.superExpress24h = p24;

  const bat = num('bat_physique_papier');
  if (bat != null) out.bat.physiquePapier = bat;

  const tana = num('livraison_tana');
  if (tana != null) out.livraison.livraisonTana = tana;
  const province = num('livraison_province');
  if (province != null) out.livraison.livraisonProvince = province;

  return out;
}

function mergeSystemConfigLayer(rowData: unknown): GlobalPricingConfig {
  const data = (rowData && typeof rowData === 'object' ? rowData : {}) as Partial<GlobalPricingConfig>;
  return {
    production: { ...DEFAULT_GLOBAL_PRICING.production, ...(data.production ?? {}) },
    bat: { ...DEFAULT_GLOBAL_PRICING.bat, ...(data.bat ?? {}) },
    livraison: { ...DEFAULT_GLOBAL_PRICING.livraison, ...(data.livraison ?? {}) },
    tvaDefault: data.tvaDefault ?? DEFAULT_GLOBAL_PRICING.tvaDefault,
  };
}

/**
 * DEFAULT_GLOBAL_PRICING ← systemConfig.global_pricing ← active global PricingVariable.
 */
export async function getGlobalPricingConfig(): Promise<GlobalPricingConfig> {
  const row = await prisma.systemConfig.findUnique({ where: { configKey: CONFIG_KEY } });
  const base = mergeSystemConfigLayer(row?.data);

  try {
    const vars = await prisma.pricingVariable.findMany({
      where: {
        active: true,
        scope: 'global',
        code: { in: [...GLOBAL_PRICING_VARIABLE_CODES] },
      },
      select: { code: true, value: true, active: true },
    });
    return mergePricingVariablesIntoGlobalConfig(base, vars);
  } catch {
    return base;
  }
}

/** Face / finition coeffs from PricingVariable — static fallbacks if DB missing. */
export async function getPricingCoeffNumbers(): Promise<{
  face_recto_verso_mult: number;
  finition_surcharge_pct: number;
}> {
  try {
    const rows = await prisma.pricingVariable.findMany({
      where: {
        active: true,
        code: { in: ['face_recto_verso_mult', 'finition_surcharge_pct'] },
      },
      select: { code: true, value: true },
    });
    const map: Record<string, number> = {};
    for (const r of rows) {
      const n = Number(r.value);
      if (Number.isFinite(n)) map[r.code] = n;
    }
    return {
      face_recto_verso_mult: map.face_recto_verso_mult ?? DEFAULT_FACE_RECTO_VERSO_MULT,
      finition_surcharge_pct: map.finition_surcharge_pct ?? DEFAULT_FINITION_SURCHARGE_PCT,
    };
  } catch {
    return {
      face_recto_verso_mult: DEFAULT_FACE_RECTO_VERSO_MULT,
      finition_surcharge_pct: DEFAULT_FINITION_SURCHARGE_PCT,
    };
  }
}

/** Map GlobalPricingConfig → PricingVariable string values (write-through). */
export function globalConfigToPricingVariableValues(
  cfg: GlobalPricingConfig,
): Record<GlobalPricingVariableCode, string> {
  return {
    tva_default: String(cfg.tvaDefault),
    production_standard: String(cfg.production.standard),
    production_express48h: String(cfg.production.express48h),
    production_super24h: String(cfg.production.superExpress24h),
    bat_physique_papier: String(cfg.bat.physiquePapier),
    livraison_tana: String(cfg.livraison.livraisonTana),
    livraison_province: String(cfg.livraison.livraisonProvince),
  };
}

export function applyProductionMultiplier(totalHT: number, delai?: string, cfg?: GlobalPricingConfig): number {
  const c = cfg || DEFAULT_GLOBAL_PRICING;
  const d = (delai || '').toLowerCase();
  if (d.includes('super') || d.includes('24')) return Math.round(totalHT * c.production.superExpress24h);
  if (d.includes('express') || d.includes('48')) return Math.round(totalHT * c.production.express48h);
  return totalHT;
}

export function applyFixedFees(
  totalHT: number,
  opts: { bat?: string; livraison?: string },
  cfg?: GlobalPricingConfig
): { totalHT: number; batFee: number; livraisonFee: number } {
  const c = cfg || DEFAULT_GLOBAL_PRICING;
  let batFee = 0;
  let livraisonFee = 0;

  const bat = (opts.bat || '').toLowerCase();
  if (bat.includes('physique') || bat.includes('papier')) batFee = c.bat.physiquePapier;
  else if (bat.includes('digital') || bat.includes('mail')) batFee = c.bat.digitalEmail;

  const liv = (opts.livraison || '').toLowerCase();
  if (liv.includes('province') || liv.includes('express')) livraisonFee = c.livraison.livraisonProvince;
  else if (liv.includes('tana') || liv.includes('antananarivo')) livraisonFee = c.livraison.livraisonTana;
  else if (liv.includes('emballage')) livraisonFee = c.livraison.emballageRenforce;
  else if (liv.includes('retrait') || liv.includes('atelier')) livraisonFee = c.livraison.retraitAtelier;

  return { totalHT: totalHT + batFee + livraisonFee, batFee, livraisonFee };
}
