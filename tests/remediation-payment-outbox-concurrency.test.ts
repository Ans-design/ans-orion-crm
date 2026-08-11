/**
 * Concurrence paiements + outbox — tests réels (Promise.all), pas mocks séquentiels.
 * SQLite local : prouve idempotence / optimistic claim.
 * Postgres SKIP LOCKED : documenté — non revendiqué prouvé par ces tests seuls.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  claimOutboxBatch,
  enqueueOutbox,
  markOutboxFailed,
  markOutboxSucceeded,
  OUTBOX_STATUS,
  paymentIdempotencyKey,
  replayOutboxDead,
} from '@/lib/server/outbox';
import {
  computeLedgerPaidTotal,
  computeLedgerReste,
  isLedgerCountableStatut,
} from '@/lib/finance/paiement-ledger';
import { getOutboxDiagnostics, displayOutboxLevel } from '@/lib/server/outbox-diagnostics';

const prisma = new PrismaClient();
const RUN = `conc-${Date.now()}`;

describe('Ledger invariants', () => {
  it('acompte = validés − remboursements ; annulés exclus', () => {
    const rows = [
      { montant: 100_000, type: 'Acompte', statut: 'Valide' },
      { montant: 50_000, type: 'Solde', statut: 'Valide' },
      { montant: 20_000, type: 'Remboursement', statut: 'Valide' },
      { montant: 10_000, type: 'Acompte', statut: 'Annule' },
      { montant: 5_000, type: 'Acompte', statut: 'Initie' },
    ];
    expect(computeLedgerPaidTotal(rows)).toBe(130_000);
    expect(computeLedgerReste(200_000, rows)).toBe(70_000);
    expect(isLedgerCountableStatut('Annule')).toBe(false);
  });

  it('refuse négatif silencieux dans le total (montant abs)', () => {
    expect(computeLedgerPaidTotal([{ montant: -100, type: 'Acompte', statut: 'Valide' }])).toBe(0);
  });
});

describe('Paiement idempotence concurrente', () => {
  let commandeId: string;

  beforeAll(async () => {
    const cmd = await prisma.commande.create({
      data: {
        numero: `CMD-${RUN}`,
        article: 'Test concurrence',
        qty: 1,
        total: 500_000,
        acompte: 0,
        reste: 500_000,
      },
    });
    commandeId = cmd.id;
  });

  afterAll(async () => {
    await prisma.paiement.deleteMany({ where: { commandeId } });
    await prisma.commande.delete({ where: { id: commandeId } }).catch(() => undefined);
  });

  it('deux créations simultanées même clé → un seul paiement', async () => {
    const key = paymentIdempotencyKey({
      provider: 'Espèces',
      reference: `ref-${RUN}-a`,
      commandeId,
      montant: 10_000,
    });

    const createOnce = async () => {
      try {
        return await prisma.paiement.create({
          data: {
            numero: `PAY-${RUN}-${Math.random().toString(36).slice(2, 8)}`,
            commandeId,
            montant: 10_000,
            mode: 'Espèces',
            reference: `ref-${RUN}-a`,
            idempotencyKey: key,
            type: 'Acompte',
            statut: 'Valide',
          },
        });
      } catch {
        return prisma.paiement.findUnique({ where: { idempotencyKey: key } });
      }
    };

    const [a, b] = await Promise.all([createOnce(), createOnce()]);
    expect(a?.id).toBeTruthy();
    expect(b?.id).toBeTruthy();
    expect(a!.id).toBe(b!.id);
    const count = await prisma.paiement.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  it('annulation retire du ledger sans supprimer la ligne', async () => {
    const p = await prisma.paiement.create({
      data: {
        numero: `PAY-${RUN}-cancel`,
        commandeId,
        montant: 25_000,
        mode: 'Espèces',
        type: 'Acompte',
        statut: 'Valide',
        idempotencyKey: `cancel-${RUN}`,
      },
    });
    await prisma.paiement.update({
      where: { id: p.id },
      data: { statut: 'Annule', cancelledAt: new Date() },
    });
    const all = await prisma.paiement.findMany({ where: { commandeId } });
    const stillThere = all.find((x) => x.id === p.id);
    expect(stillThere?.statut).toBe('Annule');
    expect(computeLedgerPaidTotal(all)).toBe(
      computeLedgerPaidTotal(all.filter((x) => x.id !== p.id)),
    );
  });

  it('reconstruction projection depuis ledger', async () => {
    const { syncCommandePaymentSnapshot } = await import(
      '@/lib/server/modules/snapshots/snapshot.service'
    );
    await syncCommandePaymentSnapshot(commandeId);
    const cmd = await prisma.commande.findUnique({ where: { id: commandeId } });
    const pays = await prisma.paiement.findMany({ where: { commandeId } });
    const expected = computeLedgerPaidTotal(pays);
    expect(cmd?.acompte).toBe(expected);
    expect(cmd?.reste).toBe(Math.max(0, (cmd?.total ?? 0) - expected));
  });
});

describe('Outbox claim concurrent + lease', () => {
  const ids: string[] = [];

  afterAll(async () => {
    if (ids.length) {
      await prisma.outboxEvent.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it('deux workers sur le même événement → un seul claim', async () => {
    const type = `TestConcurrentClaim-${RUN}`;
    const enq = await enqueueOutbox({
      type,
      aggregateType: 'Test',
      aggregateId: RUN,
      idempotencyKey: `ox-claim-${RUN}`,
      payload: { run: RUN },
    });
    ids.push(enq.id);

    const [w1, w2] = await Promise.all([
      claimOutboxBatch({ workerId: `w1-${RUN}`, limit: 5, types: [type] }),
      claimOutboxBatch({ workerId: `w2-${RUN}`, limit: 5, types: [type] }),
    ]);

    const claimedIds = [...w1, ...w2].filter((c) => c.id === enq.id);
    expect(claimedIds.length).toBe(1);

    await markOutboxSucceeded(enq.id);
  });

  it('crash après acquisition → reprise après expiration lease', async () => {
    const type = `TestLeaseExpiry-${RUN}`;
    const enq = await enqueueOutbox({
      type,
      aggregateType: 'Test',
      aggregateId: `${RUN}-lease`,
      idempotencyKey: `ox-lease-${RUN}`,
      payload: { run: RUN },
    });
    ids.push(enq.id);

    const batch1 = await claimOutboxBatch({
      workerId: `crash-${RUN}`,
      limit: 5,
      leaseMs: 1,
      types: [type],
    });
    const first = batch1.find((c) => c.id === enq.id);
    expect(first?.id).toBe(enq.id);

    await prisma.outboxEvent.update({
      where: { id: enq.id },
      data: { lockedAt: new Date(Date.now() - 120_000), status: OUTBOX_STATUS.PROCESSING },
    });

    const batch2 = await claimOutboxBatch({
      workerId: `recover-${RUN}`,
      limit: 5,
      leaseMs: 60_000,
      types: [type],
    });
    const reclaim = batch2.find((c) => c.id === enq.id);
    expect(reclaim?.id).toBe(enq.id);
    expect(reclaim?.attempts).toBeGreaterThanOrEqual(2);
    await markOutboxSucceeded(enq.id);
  });

  it('retry puis dead + rejeu contrôlé', async () => {
    const type = `TestDeadReplay-${RUN}`;
    const enq = await enqueueOutbox({
      type,
      aggregateType: 'Test',
      aggregateId: `${RUN}-dead`,
      idempotencyKey: `ox-dead-${RUN}`,
      payload: { invalid: true },
    });
    ids.push(enq.id);

    const batch = await claimOutboxBatch({
      workerId: `dead-${RUN}`,
      limit: 5,
      types: [type],
    });
    const c = batch.find((x) => x.id === enq.id);
    expect(c?.id).toBe(enq.id);
    await markOutboxFailed(c!.id, { message: 'invalid permanent', code: 'INVALID' }, { dead: true });

    const row = await prisma.outboxEvent.findUnique({ where: { id: enq.id } });
    expect(row?.status).toBe(OUTBOX_STATUS.DEAD);

    const replay = await replayOutboxDead(enq.id, { resetAttempts: true });
    expect(replay.ok).toBe(true);
    const again = await prisma.outboxEvent.findUnique({ where: { id: enq.id } });
    expect(again?.status).toBe(OUTBOX_STATUS.PENDING);
    await markOutboxSucceeded(enq.id);
  });

  it('enqueue idempotent concurrent', async () => {
    const key = `ox-idemp-${RUN}`;
    const results = await Promise.all([
      enqueueOutbox({
        type: 'TestIdemp',
        aggregateType: 'Test',
        aggregateId: RUN,
        idempotencyKey: key,
        payload: { n: 1 },
      }),
      enqueueOutbox({
        type: 'TestIdemp',
        aggregateType: 'Test',
        aggregateId: RUN,
        idempotencyKey: key,
        payload: { n: 2 },
      }),
    ]);
    expect(results[0].id).toBe(results[1].id);
    ids.push(results[0].id);
    const n = await prisma.outboxEvent.count({ where: { idempotencyKey: key } });
    expect(n).toBe(1);
  });
});

describe('Diagnostics outbox honnêtes', () => {
  it('mesure exécutée → pas NOT_CHECKED ; niveau cohérent', async () => {
    const report = await getOutboxDiagnostics();
    expect(report.checked).toBe(true);
    expect(report.checkedAt).toBeTruthy();
    expect(report.pending).not.toBeNull();
    const level = displayOutboxLevel(report);
    expect(['HEALTHY', 'DEGRADED', 'FAILED', 'UNKNOWN']).toContain(level);
    if (!report.checked) {
      expect(level).toBe('NOT_CHECKED');
    }
  });
});

describe('stabilité (répéter localement)', () => {
  it('claim batch vide ne plante pas', async () => {
    const empty = await claimOutboxBatch({
      workerId: `empty-${RUN}`,
      limit: 1,
    });
    expect(Array.isArray(empty)).toBe(true);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
