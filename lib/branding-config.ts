import { prisma } from '@/lib/prisma';

export const BRANDING_CONFIG_KEY = 'branding';

export type BrandingConfig = {
  companyName: string;
  companySubtitle: string;
  contactEmail: string;
  showPublicVersion: boolean;
  logoUrl?: string | null;
};

export const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'ANS DESIGN PRINT',
  companySubtitle: 'ERP',
  contactEmail: process.env.ACCESS_CONTACT_EMAIL || 'ans.designprint.annexe@gmail.com',
  showPublicVersion: false,
  logoUrl: null,
};

export async function getBrandingConfig(): Promise<BrandingConfig> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { configKey: BRANDING_CONFIG_KEY } });
    if (!row?.data || typeof row.data !== 'object') return DEFAULT_BRANDING;
    return { ...DEFAULT_BRANDING, ...(row.data as Partial<BrandingConfig>) };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export async function updateBrandingConfig(
  data: Partial<BrandingConfig>,
  updatedBy?: string,
): Promise<BrandingConfig> {
  const current = await getBrandingConfig();
  const merged = { ...current, ...data };
  await prisma.systemConfig.upsert({
    where: { configKey: BRANDING_CONFIG_KEY },
    create: { configKey: BRANDING_CONFIG_KEY, data: merged, updatedBy },
    update: { data: merged, updatedBy },
  });
  return merged;
}

/** Données exposées publiquement (page login) — jamais l'email de contact brut */
export function toPublicBranding(config: BrandingConfig) {
  return {
    companyName: config.companyName,
    companySubtitle: config.companySubtitle,
    showPublicVersion: config.showPublicVersion,
    logoUrl: config.logoUrl ?? null,
  };
}
