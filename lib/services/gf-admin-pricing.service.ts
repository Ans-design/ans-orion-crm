/**
 * Tarifs Admin Grand Format / bâche — SystemConfig + runtime.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  DEFAULT_GF_ADMIN_PRICING,
  GF_ADMIN_PRICING_CONFIG_KEY,
  getGfAdminPricing,
  normalizeGfAdminPricing,
  setGfAdminPricingRuntime,
  type GfAdminPricingConfig,
} from '@/lib/grand-format/gf-admin-config';

export async function loadGfAdminPricingToRuntime(): Promise<GfAdminPricingConfig> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { configKey: GF_ADMIN_PRICING_CONFIG_KEY },
    });
    if (row?.data) {
      const cfg = normalizeGfAdminPricing(row.data);
      setGfAdminPricingRuntime(cfg);
      return cfg;
    }
  } catch {
    /* fallback defaults */
  }
  setGfAdminPricingRuntime(null);
  return getGfAdminPricing();
}

export async function getGfAdminPricingConfig(): Promise<{
  config: GfAdminPricingConfig;
  source: 'db' | 'defaults';
}> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { configKey: GF_ADMIN_PRICING_CONFIG_KEY },
    });
    if (row?.data) {
      const config = normalizeGfAdminPricing(row.data);
      setGfAdminPricingRuntime(config);
      return { config, source: 'db' };
    }
  } catch {
    /* defaults */
  }
  setGfAdminPricingRuntime(null);
  return { config: { ...DEFAULT_GF_ADMIN_PRICING }, source: 'defaults' };
}

export async function saveGfAdminPricingConfig(
  patch: Partial<GfAdminPricingConfig>,
  userId?: string,
): Promise<GfAdminPricingConfig> {
  const current = await getGfAdminPricingConfig();
  const next = normalizeGfAdminPricing({ ...current.config, ...patch });

  await prisma.systemConfig.upsert({
    where: { configKey: GF_ADMIN_PRICING_CONFIG_KEY },
    create: {
      configKey: GF_ADMIN_PRICING_CONFIG_KEY,
      data: next as object,
    },
    update: {
      data: next as object,
    },
  });

  setGfAdminPricingRuntime(next);
  await logAudit({
    userId,
    action: 'UPSERT',
    entity: 'SystemConfig',
    entityId: GF_ADMIN_PRICING_CONFIG_KEY,
    entityLabel: 'GF Admin Pricing',
    details: next,
  });

  return next;
}

export async function resetGfAdminPricingConfig(userId?: string): Promise<GfAdminPricingConfig> {
  const next = { ...DEFAULT_GF_ADMIN_PRICING };
  await prisma.systemConfig.upsert({
    where: { configKey: GF_ADMIN_PRICING_CONFIG_KEY },
    create: {
      configKey: GF_ADMIN_PRICING_CONFIG_KEY,
      data: next as object,
    },
    update: {
      data: next as object,
    },
  });
  setGfAdminPricingRuntime(next);
  await logAudit({
    userId,
    action: 'RESET',
    entity: 'SystemConfig',
    entityId: GF_ADMIN_PRICING_CONFIG_KEY,
    entityLabel: 'GF Admin Pricing',
    details: next,
  });
  return next;
}
