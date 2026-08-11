import { describe, expect, it } from 'vitest';
import {
  computePaidTotal,
  factureResteDue,
} from '@/lib/finance/kpi-live-aggregates';

describe('kpi-live-aggregates', () => {
  it('factureResteDue utilise le ledger (remboursements soustraits)', () => {
    expect(
      factureResteDue(100_000, [
        { montant: 40_000, type: 'Acompte' },
        { montant: 10_000, type: 'Remboursement' },
      ]),
    ).toBe(70_000);
  });

  it('computePaidTotal réexporté depuis payment-totals', () => {
    expect(
      computePaidTotal([
        { montant: 50_000, type: 'Solde' },
        { montant: 5_000, type: 'Remboursement' },
      ]),
    ).toBe(45_000);
  });
});
