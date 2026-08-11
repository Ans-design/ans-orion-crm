import { prisma } from '@/lib/prisma';
import {
  CARRIERS_CONFIG_KEY,
  DEFAULT_CARRIERS,
  normalizeCarriersConfig,
  carriersConfigSchema,
  type MadagascarCarrier,
} from '@/lib/logistics/carriers-config';
import type { z } from 'zod';

type CarrierConfigRow = z.infer<typeof carriersConfigSchema>[number];

export async function getCarriersConfig(): Promise<MadagascarCarrier[]> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { configKey: CARRIERS_CONFIG_KEY },
    });
    if (row?.data) return normalizeCarriersConfig(row.data);
  } catch {
    /* fallback */
  }
  return DEFAULT_CARRIERS;
}

/** Config complète backoffice (inclut entrées masquées `active: false`). */
export async function getCarriersConfigAdmin() {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { configKey: CARRIERS_CONFIG_KEY },
    });
    if (row?.data) {
      const parsed = carriersConfigSchema.safeParse(row.data);
      if (parsed.success) return parsed.data;
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_CARRIERS.map((c) => ({ ...c, active: true }));
}

export async function saveCarriersConfig(
  carriers: CarrierConfigRow[],
  userId?: string,
): Promise<MadagascarCarrier[]> {
  const parsed = carriersConfigSchema.parse(carriers);
  await prisma.systemConfig.upsert({
    where: { configKey: CARRIERS_CONFIG_KEY },
    create: {
      configKey: CARRIERS_CONFIG_KEY,
      data: parsed as object,
      updatedBy: userId,
    },
    update: {
      data: parsed as object,
      updatedBy: userId,
    },
  });
  return normalizeCarriersConfig(parsed);
}
