import { prisma } from '@/lib/prisma';
import { DEFAULT_FISCAL, FISCAL_CONFIG_KEY, type FiscalConfig } from '@/lib/fiscal-config';

export async function getFiscalConfig(): Promise<FiscalConfig> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { configKey: FISCAL_CONFIG_KEY } });
    if (!row?.data || typeof row.data !== 'object') return DEFAULT_FISCAL;
    return { ...DEFAULT_FISCAL, ...(row.data as Partial<FiscalConfig>) };
  } catch {
    return DEFAULT_FISCAL;
  }
}

export async function updateFiscalConfig(data: Partial<FiscalConfig>, updatedBy?: string): Promise<FiscalConfig> {
  const current = await getFiscalConfig();
  const merged = { ...current, ...data };
  await prisma.systemConfig.upsert({
    where: { configKey: FISCAL_CONFIG_KEY },
    create: { configKey: FISCAL_CONFIG_KEY, data: merged, updatedBy },
    update: { data: merged, updatedBy },
  });
  return merged;
}
