import { describe, expect, it } from 'vitest';
import { mutationOk, mutationFail } from '@/lib/server/mutation-envelope';
import { paymentIdempotencyKey } from '@/lib/server/outbox';
import { hashPricingSnapshot } from '@/lib/pricing/pricing-release-service';
import { resolveCanonicalEntryPrice } from '@/lib/pricing/canonical-price-resolver';

describe('V12 mutation envelope', () => {
  it('ok envelope exposes sync status', () => {
    const body = mutationOk({
      entityType: 'Commande',
      entityId: 'c1',
      version: 2,
      syncStatus: 'QUEUED',
      pendingProjections: ['gpao', 'talk'],
      runId: 'run1',
    });
    expect(body.ok).toBe(true);
    expect(body.sync.status).toBe('QUEUED');
    expect(body.sync.pendingProjections).toEqual(['gpao', 'talk']);
    expect(body.entity.version).toBe(2);
  });

  it('fail envelope never claims ok', () => {
    const body = mutationFail({ message: 'Conflict', code: 'VERSION_CONFLICT' });
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VERSION_CONFLICT');
  });
});

describe('V12 payment idempotency key', () => {
  it('is stable for same inputs', () => {
    const a = paymentIdempotencyKey({
      provider: 'mvola',
      reference: 'REF-1',
      factureId: 'f1',
      montant: 1000.5,
    });
    const b = paymentIdempotencyKey({
      provider: 'mvola',
      reference: 'REF-1',
      factureId: 'f1',
      montant: 1000.5,
    });
    expect(a).toBe(b);
    expect(a).toContain('mvola:f1:');
  });
});

describe('V12 admin sync report contract', () => {
  it('AdminToCommercialSyncReport requires honest ok field', async () => {
    const src = await import('fs').then((fs) =>
      fs.readFileSync('lib/services/admin-to-commercial-sync.service.ts', 'utf8'),
    );
    expect(src).toMatch(/const ok = syncStatus === 'succeeded'/);
    expect(src).toMatch(/createSyncRun/);
    expect(src).not.toMatch(/return \{\s*ok: true,\s*catalogue/);
  });
});

describe('V12 devis accept outbox in TX', () => {
  it('enqueues DevisAccepted inside transaction', async () => {
    const src = await import('fs').then((fs) =>
      fs.readFileSync('lib/services/devis-accept-service.ts', 'utf8'),
    );
    expect(src).toMatch(/type: 'DevisAccepted'/);
    expect(src).toMatch(/enqueueOutbox\(\{[\s\S]*tx,/);
  });
});

describe('V12 pricing release hash', () => {
  it('is deterministic for same snapshot', () => {
    const a = hashPricingSnapshot({ profiles: [{ id: 'x' }], v: 1 });
    const b = hashPricingSnapshot({ profiles: [{ id: 'x' }], v: 1 });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe('V12 soft archive', () => {
  it('blocks hard delete for ledger entities', async () => {
    const { assertSoftDeleteAllowed } = await import('@/lib/server/soft-archive');
    expect(assertSoftDeleteAllowed('Paiement').ok).toBe(false);
    expect(assertSoftDeleteAllowed('Client').ok).toBe(true);
  });
});

describe('V12 lot4 bootstrap uniqueness contract', () => {
  it('schema marks ProductionDossier and StudioBrief unique by commande', async () => {
    const src = await import('fs').then((fs) => fs.readFileSync('prisma/schema.prisma', 'utf8'));
    expect(src).toMatch(/model ProductionDossier[\s\S]*?@@unique\(\[commandeId\]\)/);
    expect(src).toMatch(/model StudioBrief[\s\S]*?@@unique\(\[commandeId\]\)/);
  });
});

describe('V12 canonical entry price', () => {
  it('returns dedicated engine for doypack without legacy excel', () => {
    const r = resolveCanonicalEntryPrice('pkg-doypack');
    if (r.unitPrice != null) {
      expect(r.source).toBe('dedicated-engine');
      expect(r.certified).toBe(true);
    } else {
      expect(r.source).toBe('unavailable');
    }
  });

  it('does not invent price for unknown article', () => {
    const r = resolveCanonicalEntryPrice('unknown-article-xyz');
    expect(r.unitPrice).toBeNull();
    expect(r.certified).toBe(false);
  });
});
