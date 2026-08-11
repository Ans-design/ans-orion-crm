const { PrismaClient } = require('@prisma/client');
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
  const n = await p.clientReclamation.count();
  console.log('reclamations count:', n);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
