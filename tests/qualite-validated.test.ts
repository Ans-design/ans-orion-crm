import { describe, expect, it } from 'vitest';
import { isQualiteStatutValide } from '@/lib/qualite/qualite-validated';

describe('isQualiteStatutValide', () => {
  it('accepts Conforme and reserve', () => {
    expect(isQualiteStatutValide('Conforme')).toBe(true);
    expect(isQualiteStatutValide('Accepte avec reserve')).toBe(true);
  });

  it('rejects pending or NC', () => {
    expect(isQualiteStatutValide('En attente contrôle')).toBe(false);
    expect(isQualiteStatutValide('Non conforme')).toBe(false);
    expect(isQualiteStatutValide(null)).toBe(false);
  });
});
