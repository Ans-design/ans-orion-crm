/**
 * Seed CI — profils pricing publiés + config admin pour sync:verify-drift.
 * Utilise PrismaClient direct (évite lib/prisma + dotenv postgres local).
 * Usage: DATABASE_URL=file:./prisma/ci.db tsx scripts/ci-seed-drift.ts
 */
import { PrismaClient } from '@prisma/client';
import { CATALOGUE } from '@/lib/data/catalogue';
import { buildDefaultAdminSnapshot, CONFIG_KEYS, DEFAULT_ADMIN_META } from '@/lib/admin-config/defaults';

const prisma = new PrismaClient();

async function seedAdminConfig() {
  const existing = await prisma.systemConfig.findUnique({
    where: { configKey: CONFIG_KEYS.published },
  });
  if (existing) return;

  const snapshot = buildDefaultAdminSnapshot('published');
  await prisma.systemConfig.create({
    data: { configKey: CONFIG_KEYS.published, data: snapshot as object },
  });
  await prisma.systemConfig.create({
    data: {
      configKey: CONFIG_KEYS.draft,
      data: { ...snapshot, status: 'draft' } as object,
    },
  });
  await prisma.systemConfig.create({
    data: {
      configKey: CONFIG_KEYS.meta,
      data: { ...DEFAULT_ADMIN_META, lastPublishedAt: new Date().toISOString() } as object,
    },
  });
  console.log('✅ Config admin initialisée (draft + publié)');
}

async function seedPublishedProfiles() {
  const published = await prisma.articlePricingProfile.count({ where: { status: 'published' } });
  const target = CATALOGUE.length;
  if (published >= target) {
    console.log(`   Profils publiés déjà OK (${published}/${target})`);
    return;
  }

  for (const item of CATALOGUE) {
    await prisma.articlePricingProfile.upsert({
      where: { articleId: item.id },
      create: {
        articleId: item.id,
        articleLabel: item.name,
        family: item.category,
        calculationType: 'piece',
        saleUnit: item.unit || 'pièce',
        status: 'published',
        prixBase: item.prixDepart ?? 1000,
        active: true,
        source: 'ci-seed',
      },
      update: {
        status: 'published',
        active: true,
        articleLabel: item.name,
        family: item.category,
      },
    });
  }
  console.log(`✅ Profils pricing publiés: ${target} articles catalogue`);
}

async function main() {
  await seedAdminConfig();
  await seedPublishedProfiles();

  try {
    const { execSync } = await import('node:child_process');
    execSync('tsx scripts/seed-base-materials-pricing.ts', { stdio: 'inherit', env: process.env });
  } catch (e) {
    console.warn('⚠ seed-base-materials-pricing skipped:', (e as Error).message);
  }

  const [published, total] = await Promise.all([
    prisma.articlePricingProfile.count({ where: { status: 'published' } }),
    prisma.articlePricingProfile.count(),
  ]);
  console.log(`   Sync drift ready — profils publiés: ${published} | total: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
