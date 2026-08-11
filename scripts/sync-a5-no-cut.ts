/**
 * Aligne PaperFormatRule A5 : cutAr=0, formule A4/2 — sync runtime POS.
 * Usage: npx tsx --require dotenv/config scripts/sync-a5-no-cut.ts
 */
import { join } from 'path';

process.env.APP_ENV = process.env.APP_ENV ?? 'local';
process.env.LOCAL_DEV = 'true';
if (!process.env.DATABASE_URL?.startsWith('file:') && !process.env.DATABASE_URL?.startsWith('postgres')) {
  process.env.DATABASE_URL = `file:${join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')}`;
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const updated = await prisma.paperFormatRule.updateMany({
      where: { formatCode: 'A5' },
      data: {
        cutAr: 0,
        supplementAr: 0,
        ratioA4: 0.5,
        formula: 'Prix A4/2',
        active: true,
      },
    });
    console.log('A5 rows updated:', updated.count);

    const { ensurePricingRulesSeeded, syncPaperFormatRulesToRuntime, verifyPricingConsistency } =
      await import('../lib/services/pricing-rules-sync.service');
    await ensurePricingRulesSeeded();
    await syncPaperFormatRulesToRuntime();
    const v = await verifyPricingConsistency();
    console.log('verify ok=', v.ok, v.issues);

    const a5 = await prisma.paperFormatRule.findUnique({ where: { formatCode: 'A5' } });
    console.log('A5 DB:', a5);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
