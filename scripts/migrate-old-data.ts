/**
 * Migration depuis ancienne base (SQLite fichier ou Postgres).
 * Usage: OLD_DATABASE_URL=... DATABASE_URL=... npm run migrate:old-data
 */
import { PrismaClient } from '@prisma/client';

const oldUrl = process.env.OLD_DATABASE_URL;
const newUrl = process.env.DATABASE_URL;

if (!oldUrl || !newUrl?.startsWith('postgres')) {
  console.error('Requis: OLD_DATABASE_URL + DATABASE_URL (PostgreSQL Neon)');
  process.exit(1);
}

const isSqlite = oldUrl.startsWith('file:');
const oldPrisma = new PrismaClient({
  datasources: { db: { url: oldUrl } },
});
const newPrisma = new PrismaClient({
  datasources: { db: { url: newUrl } },
});

async function copyUsers() {
  const users = await oldPrisma.user.findMany();
  let n = 0;
  for (const u of users) {
    await newPrisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: u.password },
      create: { email: u.email, name: u.name, role: u.role, password: u.password },
    });
    n++;
  }
  console.log(`  users: ${n}`);
}

async function copyClients() {
  const rows = await oldPrisma.client.findMany();
  let n = 0;
  for (const c of rows) {
    await newPrisma.client.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
    n++;
  }
  console.log(`  clients: ${n}`);
}

async function main() {
  console.log(`Migration ${isSqlite ? 'SQLite' : 'PostgreSQL'} → Neon\n`);
  await newPrisma.$queryRaw`SELECT 1`;
  await copyUsers();
  await copyClients();
  // Étendre : commandes, devis, factures, auditLog, cartDraft, etc.
  console.log('\n✅ Migration partielle terminée. Complétez avec seed:production si besoin.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await oldPrisma.$disconnect();
    await newPrisma.$disconnect();
  });
