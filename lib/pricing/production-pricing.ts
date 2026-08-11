import type { UrgencyRule } from '@prisma/client';
import type { GlobalPricingConfig } from '@/lib/data/global-pricing';
import { DEFAULT_GLOBAL_PRICING } from '@/lib/data/global-pricing';

export type ProductionSurchargeResult = {
  multiplier: number;
  surchargePercent: number;
  source: string;
  matchedLabel: string | null;
  requiresValidation: boolean;
};

function productionMultiplierFromGlobal(delai: string, cfg: GlobalPricingConfig): number {
  const d = delai.toLowerCase();
  if (d.includes('super') || d.includes('24')) return cfg.production.superExpress24h;
  if (d.includes('express') || d.includes('48')) return cfg.production.express48h;
  return cfg.production.standard;
}

function delaiMatchesRule(delai: string, rule: UrgencyRule): boolean {
  const d = delai.toLowerCase();
  const label = rule.label.toLowerCase();
  if (!d) return rule.surchargePercent === 0;

  if (label.includes('24') || label.includes('super')) {
    return d.includes('super') || /\b24\b/.test(d);
  }
  if (label.includes('48') || (label.includes('express') && !label.includes('super'))) {
    if (d.includes('super') || /\b24\b/.test(d)) return false;
    return d.includes('express') || d.includes('48');
  }
  if (label.includes('standard')) {
    return d.includes('standard') || d.includes('atelier');
  }
  return false;
}

export function resolveProductionSurcharge(
  delai: string,
  urgencyRules: UrgencyRule[],
  globalCfg: GlobalPricingConfig = DEFAULT_GLOBAL_PRICING,
): ProductionSurchargeResult {
  const sorted = [...urgencyRules].sort((a, b) => b.surchargePercent - a.surchargePercent);

  for (const rule of sorted) {
    if (!rule.active) continue;
    if (delaiMatchesRule(delai, rule)) {
      const multiplier = 1 + rule.surchargePercent / 100;
      return {
        multiplier,
        surchargePercent: rule.surchargePercent,
        source: 'urgencyRule',
        matchedLabel: rule.label,
        requiresValidation: rule.requiresValidation,
      };
    }
  }

  const multiplier = productionMultiplierFromGlobal(delai, globalCfg);
  const surchargePercent = Math.round((multiplier - 1) * 1000) / 10;
  return {
    multiplier,
    surchargePercent,
    source: 'globalProduction',
    matchedLabel: null,
    requiresValidation: multiplier > 1,
  };
}

export function applyProductionSurcharge(
  totalHT: number,
  delai: string,
  urgencyRules: UrgencyRule[],
  globalCfg?: GlobalPricingConfig,
): { totalHT: number; production: ProductionSurchargeResult } {
  const production = resolveProductionSurcharge(delai, urgencyRules, globalCfg);
  return {
    totalHT: Math.round(totalHT * production.multiplier),
    production,
  };
}
