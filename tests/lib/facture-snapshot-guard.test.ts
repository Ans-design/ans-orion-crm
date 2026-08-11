import { describe, expect, it } from 'vitest';
import { assertCommandeBillable } from '@/lib/commande/facture-snapshot-guard';
import { buildOrderAcceptSnapshot } from '@/lib/commande/order-snapshot';

describe('facture-snapshot-guard', () => {
  const snapshot = buildOrderAcceptSnapshot({
    devis: {
      id: 'd1',
      numero: 'DEV-001',
      sousTotal: 100,
      remise: 0,
      totalHT: 100,
      totalTTC: 120,
      validUntil: null,
      clientId: null,
      client: null,
      lignes: [{
        articleId: 'a1',
        articleLabel: 'Flyer A6',
        configSnapshot: { qty: 500, _pricingSnapshot: { unitPrice: 0.2 } },
        quantity: 500,
        totalLigne: 100,
        prixUnitaireAuto: 0.2,
      }],
    },
    meta: null,
  });

  it('autorise facture si snapshot commande valide', () => {
    const r = assertCommandeBillable({
      id: 'c1',
      numero: 'CMD-001',
      configSnapshot: snapshot,
      lignes: [{ articleLabel: 'Flyer A6', configSnapshot: { qty: 500 } }],
    });
    expect(r.ok).toBe(true);
  });

  it('bloque facture sans snapshot', () => {
    const r = assertCommandeBillable({
      id: 'c1',
      numero: 'CMD-001',
      configSnapshot: null,
      lignes: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('SNAPSHOT_MISSING');
  });
});
