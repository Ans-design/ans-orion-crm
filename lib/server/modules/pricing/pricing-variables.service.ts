import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import {
  getGlobalPricingConfig,
  GLOBAL_PRICING_VARIABLE_CODES,
  type GlobalPricingVariableCode,
} from '@/lib/pricing/global-config';

const CONFIG_KEY = 'global_pricing';

export type PricingVariableItem = {
  id: string;
  code: string;
  label: string;
  value: string;
  unit: string | null;
  valueType: string;
  scope: string;
  version: number;
  active: boolean;
  source: string | null;
  updatedAt: string;
};

function toItem(row: {
  id: string;
  code: string;
  label: string;
  value: string;
  unit: string | null;
  valueType: string;
  scope: string;
  version: number;
  active: boolean;
  source: string | null;
  updatedAt: Date;
}): PricingVariableItem {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    value: row.value,
    unit: row.unit,
    valueType: row.valueType,
    scope: row.scope,
    version: row.version,
    active: row.active,
    source: row.source,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Liste les PricingVariable actives de scope global (source de vérité tarification). */
export async function listGlobalPricingVariables(): Promise<PricingVariableItem[]> {
  const rows = await prisma.pricingVariable.findMany({
    where: { scope: 'global', active: true },
    orderBy: { code: 'asc' },
  });
  return rows.map(toItem);
}

export type UpdatePricingVariableInput = {
  code: string;
  value: string;
  label?: string;
};

/**
 * Met à jour une PricingVariable globale par code.
 * Si le code alimente GlobalPricingConfig, resynchronise systemConfig (write-through inversé).
 */
export async function updateGlobalPricingVariable(
  input: UpdatePricingVariableInput,
  userId: string,
): Promise<PricingVariableItem> {
  const code = input.code.trim();
  const value = String(input.value).trim();
  if (!code) throw new Error('Code requis');
  if (value === '') throw new Error('Valeur requise');

  const existing = await prisma.pricingVariable.findFirst({
    where: { code, scope: 'global', active: true },
  });
  if (!existing) {
    throw new Error(`Variable introuvable ou inactive : ${code}`);
  }

  const updated = await prisma.pricingVariable.update({
    where: { id: existing.id },
    data: {
      value,
      ...(input.label != null && input.label.trim() !== ''
        ? { label: input.label.trim() }
        : {}),
      version: { increment: 1 },
      source: 'admin-pricing-variables',
    },
  });

  if ((GLOBAL_PRICING_VARIABLE_CODES as readonly string[]).includes(code)) {
    try {
      await syncSystemConfigFromPricingVariables(userId);
    } catch (err) {
      console.warn('[pricing-variables] sync systemConfig failed:', err);
    }
  }

  return toItem(updated);
}

/** Écrit systemConfig.global_pricing depuis getGlobalPricingConfig (DB-first). */
async function syncSystemConfigFromPricingVariables(userId: string): Promise<void> {
  const merged = await getGlobalPricingConfig();
  await prisma.systemConfig.upsert({
    where: { configKey: CONFIG_KEY },
    create: {
      configKey: CONFIG_KEY,
      data: merged as unknown as Prisma.InputJsonValue,
      updatedBy: userId,
    },
    update: {
      data: merged as unknown as Prisma.InputJsonValue,
      updatedBy: userId,
    },
  });
}

export function isGlobalPricingConfigCode(code: string): code is GlobalPricingVariableCode {
  return (GLOBAL_PRICING_VARIABLE_CODES as readonly string[]).includes(code);
}
