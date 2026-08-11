import { describe, expect, it } from 'vitest';
import { bacheEvalToGfBillable } from '@/lib/grand-format/bache-bridge';
import { evaluateBache } from '@/lib/grand-format/bache-rules';

describe('bache-bridge', () => {
  it('convertit evaluateBache en GrandFormatBillableResult', () => {
    const ev = evaluateBache(
      {
        type_bache: 'Bâche PVC standard',
        grammage: '440g',
        laize: '1m60',
        dos: 'Dos blanc',
        aspect: 'Mat',
        format: 'Format personnalisé',
        longueur_cm: 200,
        largeur_cm: 120,
        qty: 1,
        face: 'Recto seul',
      },
      { prixM2: 20000 },
    );
    const gf = bacheEvalToGfBillable(ev, 20000);
    expect(gf.surfaceReelleM2).toBe(2.4);
    expect(gf.laizeLabel).toBe('1m60');
    expect(gf.prixUnitaire).toBeGreaterThan(0);
  });
});
