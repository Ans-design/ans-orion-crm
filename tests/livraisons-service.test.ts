import { describe, expect, it } from 'vitest';
import { LivraisonStatut } from '@prisma/client';
import { buildLivraisonWhere } from '@/lib/server/modules/livraisons/livraisons.repository';
import { parseLivraisonListQuery } from '@/lib/server/modules/livraisons/livraisons.service';
describe('livraisons service', () => {
  it('parseLivraisonListQuery — commande et statut', () => {
    const q = parseLivraisonListQuery(new URLSearchParams('commande=cmd1&statut=Prêt&search=dupont'));
    expect(q.commandeId).toBe('cmd1');
    expect(q.statut).toBe('Prêt');
    expect(q.search).toBe('dupont');
  });

  it('buildLivraisonWhere — filtre statut', () => {
    const where = buildLivraisonWhere({ search: '', statut: 'En livraison', commandeId: '', livreur: '' });
    expect(where).toMatchObject({ statut: LivraisonStatut.En_livraison });
  });
});
