/**
 * Vérifie les compteurs DB production Neon.
 * Usage: DATABASE_URL="postgresql://..." npm run verify:production
 */
import { patchPostgresSchema, restorePostgresSchema } from './lib/postgres-prisma-patch';

const url = process.env.DATABASE_URL;
if (!url?.startsWith('postgres')) {
  console.error('❌ DATABASE_URL PostgreSQL requis');
  process.exit(1);
}

async function main() {
  patchPostgresSchema();
  process.env.USE_PRODUCTION_DB = 'true';
  process.env.DEMO_MODE = 'false';

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    await prisma.$queryRaw`SELECT 1`;
    const counts = {
      users: await prisma.user.count(),
      clients: await prisma.client.count(),
      commandes: await prisma.commande.count(),
      devis: await prisma.devis.count(),
      factures: await prisma.facture.count(),
      auditLogs: await prisma.auditLog.count(),
      employees: await prisma.employee.count().catch(() => 0),
    };

    console.log('\n📊 État base production Neon\n');
    for (const [k, v] of Object.entries(counts)) {
      console.log(`  ${k.padEnd(12)} ${v}`);
    }

    const ok = counts.users >= 2 && counts.clients >= 5;
    console.log(ok ? '\n✅ Base prête pour production' : '\n⚠️  Base incomplète — npm run seed:production');
    if (!ok) process.exit(1);
  } finally {
    await prisma.$disconnect();
    restorePostgresSchema();
  }
}

main().catch((e) => {
  console.error('❌', e);
  restorePostgresSchema();
  process.exit(1);
});
