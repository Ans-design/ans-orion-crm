import { describe, expect, it } from 'vitest';
import {
  inferLiveDomainsFromUrl,
  type OrionLiveDomain,
} from '@/lib/live/orion-live';
import { getEntityExcelModule } from '@/lib/crm/entity-excel-modules';
import { getNextAction } from '@/lib/flow/next-action';

describe('Orion live domains étendus', () => {
  it('infère paiements → factures/commandes/caisse', () => {
    const d = inferLiveDomainsFromUrl('/api/paiements');
    expect(d).toEqual(expect.arrayContaining(['paiements', 'factures', 'commandes', 'caisse']));
  });

  it('infère reclamations, machines, achats, rh', () => {
    expect(inferLiveDomainsFromUrl('/api/reclamations')).toEqual(
      expect.arrayContaining(['reclamations', 'clients', 'rh'] satisfies OrionLiveDomain[]),
    );
    expect(inferLiveDomainsFromUrl('/api/machines')).toEqual(
      expect.arrayContaining(['machines', 'production']),
    );
    expect(inferLiveDomainsFromUrl('/api/purchase-orders')).toEqual(
      expect.arrayContaining(['achats', 'stock']),
    );
    expect(inferLiveDomainsFromUrl('/api/rh/employes')).toEqual(
      expect.arrayContaining(['rh']),
    );
  });
});

describe('Import honnête entity-data', () => {
  it('désactive import devis/achats/livraisons/ledger', () => {
    expect(getEntityExcelModule('devis')?.allowImport).toBe(false);
    expect(getEntityExcelModule('purchase-orders')?.allowImport).toBe(false);
    expect(getEntityExcelModule('livraisons')?.allowImport).toBe(false);
    expect(getEntityExcelModule('commandes')?.allowImport).toBe(false);
    expect(getEntityExcelModule('factures')?.allowImport).toBe(false);
  });
});

describe('next-action commande canonique', () => {
  it('délègue à resolveCommandeNextAction quand entityId présent', () => {
    const a = getNextAction({
      entity: 'commande',
      status: 'Prête',
      entityId: 'cmd-1',
      metadata: { reste: 0, total: 1000 },
    });
    expect(a).not.toBeNull();
    // Prête + soldée → livraison (canonique resolveCommandeNextAction)
    expect(a?.href).toContain('/livraisons');
  });
});
