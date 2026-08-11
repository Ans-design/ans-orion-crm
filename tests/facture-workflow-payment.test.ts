import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FactureStatut } from '@prisma/client';
import {
  computePaidTotal,
  resolveCommandeLinkedFactureStatut,
  resolveFactureStatutFromPayments,
} from '@/lib/finance/payment-totals';

describe('payment totals', () => {
  it('soustrait les remboursements', () => {
    const total = computePaidTotal([
      { montant: 50_000, type: 'Acompte' },
      { montant: 10_000, type: 'Remboursement' },
      { montant: 30_000, type: 'Solde' },
    ]);
    expect(total).toBe(70_000);
  });

  it('marque facture payée au seuil TTC', () => {
    expect(
      resolveFactureStatutFromPayments(120_000, 120_000, FactureStatut.Brouillon),
    ).toBe(FactureStatut.Payee);
  });

  it('marque facture partielle sur acompte', () => {
    expect(
      resolveFactureStatutFromPayments(40_000, 120_000, FactureStatut.Brouillon),
    ).toBe(FactureStatut.Partiellement_payee);
  });

  it('resync commandeId only — soldé via total commande', () => {
    expect(
      resolveCommandeLinkedFactureStatut(
        100_000,
        120_000,
        100_000,
        FactureStatut.Brouillon,
      ),
    ).toBe(FactureStatut.Payee);
  });

  it('resync commandeId only — partiel', () => {
    expect(
      resolveCommandeLinkedFactureStatut(
        30_000,
        120_000,
        100_000,
        FactureStatut.Brouillon,
      ),
    ).toBe(FactureStatut.Partiellement_payee);
  });

  it('ignore factures annulées', () => {
    expect(
      resolveCommandeLinkedFactureStatut(
        100_000,
        120_000,
        100_000,
        FactureStatut.Annulee,
      ),
    ).toBeNull();
  });
});

const factureUpdate = vi.fn();
const paiementFindMany = vi.fn();
const factureFindMany = vi.fn();
const commandeFindUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    commande: { findUnique: (...args: unknown[]) => commandeFindUnique(...args) },
    paiement: { findMany: (...args: unknown[]) => paiementFindMany(...args) },
    facture: {
      findMany: (...args: unknown[]) => factureFindMany(...args),
      update: (...args: unknown[]) => factureUpdate(...args),
    },
  },
}));

import { syncCommandeLinkedFacturesFromPayments } from '@/lib/services/facture-workflow-service';

describe('syncCommandeLinkedFacturesFromPayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('met à jour la facture liée après paiement commandeId', async () => {
    commandeFindUnique.mockResolvedValue({ id: 'cmd-1', total: 100_000 });
    paiementFindMany.mockResolvedValue([{ montant: 100_000, type: 'Solde' }]);
    factureFindMany.mockResolvedValue([
      { id: 'fac-1', totalTTC: 120_000, statut: FactureStatut.Brouillon, dateEmission: null },
    ]);
    factureUpdate.mockResolvedValue({});

    await syncCommandeLinkedFacturesFromPayments('cmd-1');

    expect(factureUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fac-1' },
        data: expect.objectContaining({ statut: FactureStatut.Payee }),
      }),
    );
  });

  it('agrège paiements facture + commande', async () => {
    commandeFindUnique.mockResolvedValue({ id: 'cmd-1', total: 200_000 });
    paiementFindMany.mockResolvedValue([
      { montant: 50_000, type: 'Acompte' },
      { montant: 30_000, type: 'Acompte' },
    ]);
    factureFindMany.mockResolvedValue([
      { id: 'fac-1', totalTTC: 200_000, statut: FactureStatut.Brouillon, dateEmission: null },
    ]);

    await syncCommandeLinkedFacturesFromPayments('cmd-1');

    expect(factureUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: FactureStatut.Partiellement_payee }),
      }),
    );
  });
});
