import { describe, expect, it } from 'vitest';
import { formatPosFieldDisplay } from '@/lib/pos/field-display';
import { syncBindingRecommendationInConfig } from '@/lib/pos/sync-binding-recommendation';

describe('field-display format personnalisé', () => {
  it('affiche le libellé généré au lieu du chip', () => {
    const field = { key: 'format', label: 'Format', type: 'chips' as const };
    const config = { format: 'Format personnalisé', longueur: 100, largeur: 50 };
    expect(formatPosFieldDisplay(field, 'Format personnalisé', config)).toBe('100 × 50 mm');
  });
});

describe('sync-binding-recommendation', () => {
  it('injecte la référence auto pour reliure spirale', () => {
    const config = {
      type: 'Spirale plastique',
      pages: '40',
      face: 'Recto-Verso',
      grammage: '80g',
    };
    const next = syncBindingRecommendationInConfig('fin-reliure', config);
    expect(next._bindingAutoLabel).toMatch(/8 mm/);
  });

  it('ignore les articles sans moteur reliure', () => {
    const config = { format: 'A4' };
    expect(syncBindingRecommendationInConfig('fly-a4', config)).toEqual(config);
  });
});
