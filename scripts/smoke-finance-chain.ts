/**
 * Smoke finance local — FIN-01 Int + ledger invariant.
 * Usage: npm run smoke:finance
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { randomBytes } from 'crypto';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });
{
  const absDb = resolve(process.cwd(), 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${absDb.replace(/\\/g, '/')}`;
  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    process.env.NEXTAUTH_SECRET = 'local-smoke-test-secret-32chars-min!!';
    process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET;
  }
  process.env.APP_ENV = process.env.APP_ENV || 'local';
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const { roundMga } = await import('../lib/money/mga');
  const { computePaidTotal } = await import('../lib/finance/payment-totals');
  const { syncCommandePaymentSnapshot } = await import(
    '../lib/server/modules/snapshots/snapshot.service'
  );

  const prisma = new PrismaClient();
  const started = Date.now();
  console.log('═══ Smoke finance chain (Int MGA) ═══');

  try {
    const cmd = await prisma.commande.findFirst({
      where: { reste: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, numero: true, total: true, acompte: true, reste: true, clientId: true },
    });
    if (!cmd) {
      console.error('❌ Aucune commande avec reste > 0');
      process.exit(2);
    }

    const payAmount = Math.min(1000, Math.max(1, Math.floor(cmd.total * 0.01) || 1));
    const ref = `SMOKE-${randomBytes(4).toString('hex')}`;
    const beforePays = await prisma.paiement.findMany({
      where: {
        OR: [{ commandeId: cmd.id }, { commandeId: null, facture: { commandeId: cmd.id } }],
      },
      select: { montant: true, type: true },
    });
    const beforeLedger = computePaidTotal(beforePays);

    const created = await prisma.paiement.create({
      data: {
        numero: `PAY-SMOKE-${Date.now()}`,
        commandeId: cmd.id,
        clientId: cmd.clientId,
        montant: payAmount,
        mode: 'Espèces',
        reference: ref,
        type: 'Acompte',
        notes: JSON.stringify({ smoke: true }),
      },
    });

    await syncCommandePaymentSnapshot(cmd.id);

    const after = await prisma.commande.findUnique({
      where: { id: cmd.id },
      select: { acompte: true, reste: true, total: true },
    });
    const afterPays = await prisma.paiement.findMany({
      where: {
        OR: [{ commandeId: cmd.id }, { commandeId: null, facture: { commandeId: cmd.id } }],
      },
      select: { montant: true, type: true },
    });
    const afterLedger = computePaidTotal(afterPays);
    const invariantOk = after != null && roundMga(after.acompte) === afterLedger;
    const intOk = Number.isInteger(created.montant) && Number.isInteger(after?.acompte);

    const report = {
      ok: Boolean(invariantOk && intOk),
      commande: cmd.numero,
      payAmount,
      beforeLedger,
      afterLedger,
      acompte: after?.acompte,
      reste: after?.reste,
      invariantOk,
      intOk,
      ms: Date.now() - started,
    };
    console.log(JSON.stringify(report, null, 2));

    await prisma.paiement.delete({ where: { id: created.id } });
    await syncCommandePaymentSnapshot(cmd.id);
    console.log('Nettoyage smoke OK');
    if (!report.ok) process.exit(1);
    console.log('✅ Smoke finance PASS');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
