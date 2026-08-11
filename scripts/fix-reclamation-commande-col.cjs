const { PrismaClient } = require('@prisma/client');
const path = require('path');

/** Ensure local SQLite has ClientReclamation.commandeId (schema drift). */
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${dbPath}`;

const p = new PrismaClient();

async function main() {
  const cols = await p.$queryRawUnsafe('PRAGMA table_info("ClientReclamation")');
  console.log('columns:', cols.map((c) => c.name).join(', '));
  const has = cols.some((c) => c.name === 'commandeId');
  if (!has) {
    console.log('Adding commandeId…');
    await p.$executeRawUnsafe('ALTER TABLE "ClientReclamation" ADD COLUMN "commandeId" TEXT');
    try {
      await p.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "ClientReclamation_commandeId_idx" ON "ClientReclamation"("commandeId")',
      );
    } catch (e) {
      console.warn('index:', e.message);
    }
    console.log('OK — commandeId added');
  } else {
    console.log('commandeId already present');
  }
  console.log('reclamations count:', await p.clientReclamation.count());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
