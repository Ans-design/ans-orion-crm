/**
 * Seed transitions workflow (commande + chaîne CRM) en DB.
 * Usage : npm run seed:workflows
 */
import { ensureWorkflowTransitionsSeeded } from '../lib/services/workflow-transition-service';

async function main() {
  const n = await ensureWorkflowTransitionsSeeded();
  console.log(`✓ ${n} règle(s) workflow en base`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('../lib/prisma');
    await prisma.$disconnect();
  });