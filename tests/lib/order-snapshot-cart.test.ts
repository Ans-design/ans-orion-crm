import { describe, expect, it } from 'vitest';
import {
  buildOrderAcceptSnapshot,
  parseOrderAcceptSnapshot,
  ORDER_SNAPSHOT_VERSION,
} from '@/lib/commande/order-snapshot';

describe('order snapshot at POS checkout', () => {
  it('builds a parseable v1 snapshot from devis-like cart data', () => {
    const snapshot = buildOrderAcceptSnapshot({
      devis: {
        id: 'dev-1',
        numero: 'DEV-TEST-1',
        sousTotal: 10000,
        remise: 0,
        totalHT: 10000,
        totalTTC: 12000,
        validUntil: null,
        clientId: 'cli-1',
        client: {
          id: 'cli-1',
          name: 'Client Test',
          tel: '0320000000',
        },
        lignes: [
          {
            articleId: 'cv-std',
            articleLabel: 'Carte de visite',
            configSnapshot: {
              format: 'A6',
              quantite: 100,
              _pricingSnapshot: {
                version: 1,
                calculatedAt: new Date().toISOString(),
                priceSource: 'test',
                formulaVersion: null,
                appliedTier: null,
                prixUnitaire: 100,
                totalHT: 10000,
              },
            },
            quantity: 100,
            totalLigne: 10000,
            prixUnitaireAuto: 100,
          },
        ],
      },
      meta: {
        modeExpedition: 'Retrait',
        priorite: 'Normale',
      },
    });

    expect(snapshot.version).toBe(ORDER_SNAPSHOT_VERSION);
    expect(snapshot.devisNumero).toBe('DEV-TEST-1');
    expect(snapshot.itemsSnapshot).toHaveLength(1);
    expect(snapshot.paymentSnapshot.resteAPayer).toBe(12000);
    expect(parseOrderAcceptSnapshot(snapshot)).not.toBeNull();
  });
});
