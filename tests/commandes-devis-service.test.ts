import { describe, expect, it } from 'vitest';
import { DevisStatut } from '@prisma/client';
import { buildCommandeWhere } from '@/lib/server/modules/commandes/commandes.repository';
import { parseCommandeListQuery } from '@/lib/server/modules/commandes/commandes.service';
import { buildDevisWhere } from '@/lib/server/modules/devis/devis.repository';
import { parseDevisListQuery } from '@/lib/server/modules/devis/devis.service';
describe('commandes service', () => {
  it('parseCommandeListQuery — summary et filtres', () => {
    const q = parseCommandeListQuery(new URLSearchParams('summary=1&resteAPayer=1&urgente=1'));
    expect(q.summary).toBe(true);
    expect(q.resteAPayer).toBe(true);
    expect(q.urgente).toBe(true);
  });

  it('buildCommandeWhere — reste à payer', () => {
    const where = buildCommandeWhere({ resteAPayer: true });
    expect(where).toMatchObject({ reste: { gt: 0 } });
  });

  it('buildCommandeWhere — ids explicites (filtre paiements réels)', () => {
    const where = buildCommandeWhere({ ids: ['c1', 'c2'] });
    expect(where).toMatchObject({ id: { in: ['c1', 'c2'] } });
  });
});

describe('devis service', () => {
  it('parseDevisListQuery — summary', () => {
    const q = parseDevisListQuery(new URLSearchParams('summary=1&statut=Accepté'));
    expect(q.summary).toBe(true);
    expect(q.statut).toBe('Accepté');
  });

  it('buildDevisWhere — statut filtré', () => {
    const where = buildDevisWhere({ statut: 'Brouillon' });
    expect(where).toMatchObject({ statut: DevisStatut.Brouillon });
  });
});

describe('paiements service', () => {
  it('commandeRemainingAmount — reste depuis encaissements réels', async () => {
    const { paidTotal, commandeRemainingAmount } = await import('@/lib/server/modules/paiements/paiements.repository');
    const paiements = [
      { montant: 50_000, type: 'Acompte' },
      { montant: 10_000, type: 'Remboursement' },
    ];
    expect(paidTotal(paiements)).toBe(40_000);
    expect(commandeRemainingAmount(100_000, paiements)).toBe(60_000);
  });

  it('parsePaiementListQuery — commandeId alias', async () => {
    const { parsePaiementListQuery } = await import('@/lib/server/modules/paiements/paiements.service');
    const q = parsePaiementListQuery(new URLSearchParams('commande=cmd123&mode=Espèces'));
    expect(q.commandeId).toBe('cmd123');
    expect(q.mode).toBe('Espèces');
  });

  it('buildPaiementWhere — recherche client', async () => {
    const { buildPaiementWhere } = await import('@/lib/server/modules/paiements/paiements.repository');
    const where = buildPaiementWhere({ search: 'dupont', mode: '', commandeId: '' });
    expect(where.OR).toHaveLength(3);
  });
});
