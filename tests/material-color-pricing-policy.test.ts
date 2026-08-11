import { describe, expect, it } from 'vitest';
import {
  isMaterialPaletteField,
  shouldMaterialColorForcePrice,
} from '@/lib/pos/material-color-pricing-policy';
import { shouldShowForcedPriceWarning } from '@/lib/pos/format-personnalise-policy';

describe('material-color-pricing-policy', () => {
  it('identifie les champs couleur matière / palette', () => {
    expect(isMaterialPaletteField({ key: 'couleur', type: 'color_palette' })).toBe(true);
    expect(isMaterialPaletteField({ key: 'couleur_doypack', type: 'color_palette' })).toBe(true);
    expect(isMaterialPaletteField({ key: 'couleur_impression', type: 'chips' })).toBe(false);
  });

  it('ne force pas le prix pour une couleur standard', () => {
    const field = { key: 'couleur', type: 'color_palette' as const, forcePriceValues: ['Personnalisée'] };
    expect(shouldMaterialColorForcePrice(field, 'Rouge')).toBe(false);
    expect(shouldMaterialColorForcePrice(field, 'Personnalisée')).toBe(true);
  });

  it('shouldShowForcedPriceWarning ignore couleur matière standard', () => {
    const field = {
      key: 'couleur',
      type: 'color_palette' as const,
      forcePriceValues: ['Personnalisée'],
    };
    expect(shouldShowForcedPriceWarning(field, 'Bleu', null)).toBe(false);
    expect(shouldShowForcedPriceWarning(field, 'Personnalisée', null)).toBe(true);
  });
});
