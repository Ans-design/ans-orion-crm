import { describe, expect, it } from 'vitest';
import { computePaidTotal } from '@/lib/finance/payment-totals';
import { commandeRemainingAmount } from '@/lib/server/modules/paiements/paiements.repository';

describe('FIN-03 ledger Int', () => {
  it('computePaidTotal arrondit et gère remboursements', () => {
    expect(
      computePaidTotal([
        { montant: 100.4, type: 'Acompte' },
        { montant: 50, type: 'Acompte' },
      ]),
    ).toBe(150);
  });

  it('reste commande cohérent', () => {
    const pays = [
      { montant: 200, type: 'Acompte' as const },
      { montant: 50, type: 'Remboursement' as const },
    ];
    expect(commandeRemainingAmount(1000, pays)).toBe(850);
  });
});
