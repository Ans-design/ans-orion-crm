import { describe, expect, it } from 'vitest';
import { shouldSetEnAttenteStock } from '@/lib/stock/en-attente-stock-rule';

describe('stock En attente — mapping vs insuffisance (intégré)', () => {
  it('ne bloque pas si skipped = article introuvable (mapping)', () => {
    expect(
      shouldSetEnAttenteStock([
        { status: 'skipped', reason: 'Article stock introuvable' },
      ]),
    ).toBe(false);
  });

  it('bloque si stock insuffisant', () => {
    expect(
      shouldSetEnAttenteStock([
        { status: 'reserved' },
        { status: 'skipped', reason: 'Stock insuffisant (0 pièce dispo, 10 requis)' },
      ]),
    ).toBe(true);
  });

  it('ne bloque pas si tout réservé', () => {
    expect(shouldSetEnAttenteStock([{ status: 'reserved' }])).toBe(false);
  });
});
