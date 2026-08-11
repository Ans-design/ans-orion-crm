import { describe, expect, it } from 'vitest';
import {
  DEVIS_EXPIRY_WARNING_DAYS,
  DEVIS_STAGNANT_DAYS,
  getDevisCommercialSignals,
} from '@/lib/server/modules/devis/devis.service';

describe('devis commercial signals', () => {
  it('marque un devis envoye comme stagnant apres le seuil de relance', () => {
    const now = new Date('2026-07-04T09:00:00.000Z');
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - DEVIS_STAGNANT_DAYS - 1);

    const signals = getDevisCommercialSignals(
      {
        statut: 'Envoyé',
        createdAt,
        validUntil: null,
      },
      now,
    );

    expect(signals.isStagnant).toBe(true);
    expect(signals.daysOpen).toBeGreaterThanOrEqual(DEVIS_STAGNANT_DAYS);
    expect(signals.expiresSoon).toBe(false);
  });

  it('signale une expiration proche sans la marquer stagnante', () => {
    const now = new Date('2026-07-04T09:00:00.000Z');
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - 2);
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + DEVIS_EXPIRY_WARNING_DAYS - 1);

    const signals = getDevisCommercialSignals(
      {
        statut: 'En attente',
        createdAt,
        validUntil,
      },
      now,
    );

    expect(signals.isStagnant).toBe(false);
    expect(signals.expiresSoon).toBe(true);
    expect(signals.daysUntilExpiry).toBe(DEVIS_EXPIRY_WARNING_DAYS - 1);
  });
});
