import { describe, expect, it } from 'vitest';
import { createPaiementSchema } from '@/lib/validators/crm';

describe('createPaiementSchema — arrondi MGA', () => {
  it('arrondit les décimales en Ariary entier', () => {
    const parsed = createPaiementSchema.parse({
      commandeId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      montant: 1000.4,
      mode: 'Espèces',
      type: 'Acompte',
    });
    expect(parsed.montant).toBe(1000);
  });

  it('refuse montant ≤ 0', () => {
    expect(() =>
      createPaiementSchema.parse({
        commandeId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        montant: 0,
        mode: 'Espèces',
      }),
    ).toThrow();
  });
});
