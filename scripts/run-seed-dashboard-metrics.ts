/**
 * Rafraîchit paiements, charges et dates commandes pour graphiques cockpit.
 * Usage: DATABASE_URL="postgresql://..." npm run seed:dashboard-metrics
 */
import { PrismaClient } from '@prisma/client';
import { seedDashboardMetrics } from './seed-dashboard-metrics';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL requis');
  process.exit(1);
}

const prisma = new PrismaClient();

seedDashboardMetrics(prisma)
  .then(() => console.log('✅ seed:dashboard-metrics terminé'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
