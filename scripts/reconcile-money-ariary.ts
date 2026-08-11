/**
 * Vérifie cohérence acompte = ledger après bascule Int.
 * Usage: npx tsx scripts/reconcile-money-ariary.ts
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });
{
  const absDb = resolve(process.cwd(), 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${absDb.replace(/\\/g, '/')}`;
}

import { PrismaClient } from '@prisma/client';
import { roundMga } from '../lib/money/mga';

const prisma = new PrismaClient();
const dry = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

async function main() {
  console.log(`═══ Réconciliation MGA Int ${dry ? '(dry-run)' : ''} ═══`);

  const cmdsWithPay = await prisma.commande.findMany({
    select: {
      id: true,
      numero: true,
      acompte: true,
      total: true,
      reste: true,
      paiements: { select: { montant: true, type: true } },
    },
  });

  const invariantDrifts: Array<{ numero: string; acompte: number; ledger: number }> = [];
  let repaired = 0;
  for (const c of cmdsWithPay) {
    const ledger = c.paiements.reduce(
      (s, p) => s + (p.type === 'Remboursement' ? -roundMga(p.montant) : roundMga(p.montant)),
      0,
    );
    if (Math.abs(roundMga(c.acompte) - ledger) > 0) {
      invariantDrifts.push({ numero: c.numero, acompte: roundMga(c.acompte), ledger });
      if (!dry) {
        const reste = Math.max(0, roundMga(c.total) - ledger);
        await prisma.commande.update({
          where: { id: c.id },
          data: { acompte: ledger, reste },
        });
        repaired++;
      }
    }
  }

  console.log(JSON.stringify({
    dry,
    commandes: cmdsWithPay.length,
    acompteVsLedger: { driftCount: invariantDrifts.length, samples: invariantDrifts.slice(0, 20) },
    repaired,
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
