import { describe, expect, it } from 'vitest';
import { MADAGASCAR_CARRIERS, carrierLabelById, carriersForZone } from '@/lib/logistics/madagascar-carriers';

describe('madagascar carriers', () => {
  it('expose les transporteurs principaux', () => {
    const ids = MADAGASCAR_CARRIERS.map((c) => c.id);
    expect(ids).toContain('ans-interne');
    expect(ids).toContain('cotisse');
    expect(ids).toContain('paositra');
  });

  it('résout le label par id', () => {
    expect(carrierLabelById('paositra')).toMatch(/Paositra/);
    expect(carrierLabelById('unknown')).toBe('unknown');
  });

  it('filtre par zone Antananarivo', () => {
    const list = carriersForZone('Antananarivo');
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((c) => c.id === 'ans-interne')).toBe(true);
  });
});
