import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/db/prisma', () => ({
  prisma: {
    paiement: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/server/db/prisma';
import {
  applyPaymentTotalsToCommande,
  batchCommandePaymentTotals,
  commandeHasResteAPayer,
  findCommandeIdsWithResteAPayer,
} from '@/lib/server/modules/commandes/commandes-payment-totals';

describe('commandes-payment-totals', () => {
  it('batchCommandePaymentTotals agrège direct + facture', async () => {
    vi.mocked(prisma.paiement.findMany).mockResolvedValue([
      { commandeId: 'c1', montant: 30_000, type: 'Acompte', facture: null },
      { commandeId: null, montant: 20_000, type: 'Solde', facture: { commandeId: 'c1' } },
      { commandeId: 'c2', montant: 5_000, type: 'Remboursement', facture: null },
    ] as never);

    const totals = await batchCommandePaymentTotals([
      { id: 'c1', total: 100_000 },
      { id: 'c2', total: 40_000 },
    ]);

    expect(totals.get('c1')).toEqual({ acompte: 50_000, reste: 50_000 });
    expect(totals.get('c2')).toEqual({ acompte: -5_000, reste: 45_000 });
  });

  it('findCommandeIdsWithResteAPayer filtre les soldés', async () => {
    vi.mocked(prisma.paiement.findMany).mockResolvedValue([
      { commandeId: 'c1', montant: 100_000, type: 'Solde', facture: null },
    ] as never);

    const ids = await findCommandeIdsWithResteAPayer([
      { id: 'c1', total: 100_000 },
      { id: 'c2', total: 50_000 },
    ]);

    expect(ids).toEqual(['c2']);
  });

  it('commandeHasResteAPayer — Ariary entier (reste > 0 = dû)', () => {
    expect(commandeHasResteAPayer({ acompte: 100, reste: 0 })).toBe(false);
    expect(commandeHasResteAPayer({ acompte: 99, reste: 1 })).toBe(true);
    expect(commandeHasResteAPayer({ acompte: 90, reste: 10 })).toBe(true);
  });

  it('applyPaymentTotalsToCommande remplace acompte/reste', () => {
    const row = { id: 'c1', total: 100, acompte: 0, reste: 100 };
    const out = applyPaymentTotalsToCommande(row, new Map([['c1', { acompte: 40, reste: 60 }]]));
    expect(out.acompte).toBe(40);
    expect(out.reste).toBe(60);
  });
});
