/**
 * Seed incrémental Neon — sans prisma generate (évite EPERM si serveur Next tourne).
 * Upsert v29 users + audit logs uniquement.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npm run seed:incremental
 */
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL?.startsWith('postgres')) {
  console.error('❌ DATABASE_URL PostgreSQL requis');
  process.exit(1);
}

process.env.USE_PRODUCTION_DB = 'true';
process.env.DEMO_MODE = 'false';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  console.log('═══ Seed incrémental (v29 users + audit) ═══\n');
  const { seedV29Users } = await import('./seed-v29-users');
  const { seedAuditActivity } = await import('./seed-audit-activity');
  const { seedDashboardMetrics } = await import('./seed-dashboard-metrics');
  await seedV29Users(prisma);
  await seedAuditActivity(prisma);
  await seedDashboardMetrics(prisma);
  const { syncAllCommandePaymentSnapshots } = await import('./seed-sync-commande-payments');
  await syncAllCommandePaymentSnapshots(prisma);
  console.log('\n✅ Seed incrémental terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
