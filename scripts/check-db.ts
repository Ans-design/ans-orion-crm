/**
 * Test connexion DB rapide (timeout 5s).
 */
import { PrismaClient } from '@prisma/client';
import { withTimeout } from '../lib/with-timeout';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith('postgres') && !url?.startsWith('file:')) {
    console.error('❌ DATABASE_URL manquant');
    process.exit(1);
  }

  const prisma = new PrismaClient(
    url.startsWith('postgres') ? { datasources: { db: { url } } } : undefined,
  );

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, 'check_db');
    const users = await prisma.user.count();
    const clients = await prisma.client.count();
    console.log('\n✅ DB connectée');
    console.log(`   users=${users} clients=${clients}\n`);
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
