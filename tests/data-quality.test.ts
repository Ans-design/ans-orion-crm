import { describe, expect, it } from 'vitest';
import { DATA_QUALITY_RULES } from '@/lib/server/modules/data-quality/data-quality.rules';

describe('data-quality', () => {
  it('DATA_QUALITY_RULES — ids uniques', () => {
    const ids = DATA_QUALITY_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('DATA_QUALITY_RULES — modules couverts', () => {
    const modules = new Set(DATA_QUALITY_RULES.map((r) => r.module));
    expect(modules.has('CRM')).toBe(true);
    expect(modules.has('Finance')).toBe(true);
    expect(modules.has('Commandes')).toBe(true);
    expect(modules.has('Devis')).toBe(true);
  });

  it('DATA_QUALITY_RULES — inclut snapshots et devis expirés', () => {
    const ids = DATA_QUALITY_RULES.map((r) => r.id);
    expect(ids).toContain('commande-no-payment-snapshot');
    expect(ids).toContain('devis-no-logistics-snapshot');
    expect(ids).toContain('devis-expired-pending');
  });
});

describe('backfillEntitySnapshots export', () => {
  it('est exporté depuis snapshot.service', async () => {
    const mod = await import('@/lib/server/modules/snapshots/snapshot.service');
    expect(mod.backfillEntitySnapshots).toBeTypeOf('function');
    expect(mod.syncCommandePaymentSnapshot).toBeTypeOf('function');
  });
});
