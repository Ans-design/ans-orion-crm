import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { GlobalPricingConfig } from '@/lib/data/global-pricing';
import { extractGlobalPricingVariables } from '@/lib/pricing/config-to-dynamic-pricing';
import {
  getGlobalPricingConfig,
  globalConfigToPricingVariableValues,
  GLOBAL_PRICING_VARIABLE_CODES,
} from '@/lib/pricing/global-config';
import type { GlobalPricingUpdateInput } from './pricing-api.validation';

const CONFIG_KEY = 'global_pricing';

export { getGlobalPricingConfig };

/** Write-through: keep PricingVariable rows aligned with admin global pricing. */
async function upsertPricingVariablesFromGlobalConfig(cfg: GlobalPricingConfig): Promise<void> {
  const values = globalConfigToPricingVariableValues(cfg);
  const seeds = extractGlobalPricingVariables();
  const labelByCode = new Map(seeds.map((s) => [s.code, s.label]));

  for (const code of GLOBAL_PRICING_VARIABLE_CODES) {
    const seed = seeds.find((s) => s.code === code);
    const label = labelByCode.get(code) ?? seed?.label ?? code;
    await prisma.pricingVariable.upsert({
      where: { code },
      create: {
        code,
        label,
        value: values[code],
        unit: seed?.unit ?? '',
        valueType: seed?.valueType ?? 'number',
        scope: seed?.scope ?? 'global',
        articleId: seed?.articleId ?? null,
        active: true,
        source: 'admin-global-pricing',
      },
      update: {
        value: values[code],
        label,
        unit: seed?.unit,
        valueType: seed?.valueType,
        scope: seed?.scope,
        version: { increment: 1 },
      },
    });
  }
}

export async function updateGlobalPricingConfig(
  patch: GlobalPricingUpdateInput,
  userId: string,
): Promise<GlobalPricingConfig> {
  const current = await getGlobalPricingConfig();
  const merged: GlobalPricingConfig = {
    production: { ...current.production, ...(patch.production ?? {}) },
    bat: { ...current.bat, ...(patch.bat ?? {}) },
    livraison: { ...current.livraison, ...(patch.livraison ?? {}) },
    tvaDefault: patch.tvaDefault ?? current.tvaDefault,
  };

  await prisma.systemConfig.upsert({
    where: { configKey: CONFIG_KEY },
    create: { configKey: CONFIG_KEY, data: merged as unknown as Prisma.InputJsonValue, updatedBy: userId },
    update: { data: merged as unknown as Prisma.InputJsonValue, updatedBy: userId },
  });

  try {
    await upsertPricingVariablesFromGlobalConfig(merged);
  } catch (err) {
    console.warn('[global-pricing] write-through PricingVariable failed:', err);
  }

  return merged;
}
