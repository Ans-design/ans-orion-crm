import { describe, expect, it } from 'vitest';
import { FactureStatut } from '@prisma/client';
import { buildFactureWhere, parseFactureListFilters } from '@/lib/server/modules/factures/factures.repository';
import { parseFactureListQuery } from '@/lib/server/modules/factures/factures.service';
import { unpaidFactureStatuts } from '@/lib/server/data/prisma-statut-bridge';
describe('factures service', () => {
  it('parseFactureListQuery — stats et impayés', () => {
    const q = parseFactureListQuery(new URLSearchParams('stats=1&impayes=1&overdue=1'));
    expect(q.stats).toBe(true);
    expect(q.impayes).toBe(true);
    expect(q.overdue).toBe(true);
  });

  it('buildFactureWhere — impayés', () => {
    const where = buildFactureWhere(parseFactureListFilters({
      search: '',
      statut: '',
      impayes: true,
      overdue: false,
      commandeId: '',
    }));
    expect(where).toMatchObject({ statut: { in: unpaidFactureStatuts() } });
    expect(where.statut).toEqual({ in: [FactureStatut.Emise, FactureStatut.Partiellement_payee] });
  });

  it('buildFactureWhere — commande liée', () => {
    const where = buildFactureWhere({ commandeId: 'cmd-1' });
    expect(where).toMatchObject({ commandeId: 'cmd-1' });
  });
});
