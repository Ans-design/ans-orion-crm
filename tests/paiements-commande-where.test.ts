import { describe, expect, it } from 'vitest';
import {
  paiementsForCommandeWhere,
  paiementsForCommandesWhere,
} from '@/lib/server/modules/paiements/paiements.repository';

describe('paiementsForCommandeWhere — isolation ledger', () => {
  it('inclut le lien direct et la facture orpheline, pas un autre commandeId', () => {
    const where = paiementsForCommandeWhere('cmd-A');
    expect(where.OR).toEqual([
      { commandeId: 'cmd-A' },
      { commandeId: null, facture: { commandeId: 'cmd-A' } },
    ]);
  });

  it('filtre batch multi-commandes sans croiser les ledgers', () => {
    const where = paiementsForCommandesWhere(['cmd-A', 'cmd-B']);
    expect(where.OR).toEqual([
      { commandeId: { in: ['cmd-A', 'cmd-B'] } },
      { commandeId: null, facture: { commandeId: { in: ['cmd-A', 'cmd-B'] } } },
    ]);
  });
});
