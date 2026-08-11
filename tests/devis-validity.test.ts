import { describe, expect, it } from 'vitest';
import {
  DEVIS_VALIDITY_DAYS,
  defaultDevisValidUntil,
  daysUntilDevisExpiry,
  isDevisExpired,
} from '@/lib/devis/devis-validity';

describe('devis-validity', () => {
  it('default validity is 60 days', () => {
    const from = new Date('2026-01-01T12:00:00Z');
    const until = defaultDevisValidUntil(from);
    expect(DEVIS_VALIDITY_DAYS).toBe(60);
    expect(until.getTime() - from.getTime()).toBe(60 * 24 * 60 * 60 * 1000);
  });

  it('detects expired devis', () => {
    expect(isDevisExpired({ validUntil: new Date('2020-01-01'), statut: 'Envoyé' })).toBe(true);
    expect(isDevisExpired({ validUntil: new Date('2099-01-01'), statut: 'Envoyé' })).toBe(false);
    expect(isDevisExpired({ statut: 'Expiré' })).toBe(true);
  });

  it('computes days until expiry', () => {
    const in10 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const days = daysUntilDevisExpiry(in10);
    expect(days).toBeGreaterThanOrEqual(9);
    expect(days).toBeLessThanOrEqual(11);
  });
});
