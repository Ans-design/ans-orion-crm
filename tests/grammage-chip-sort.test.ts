import { describe, expect, it } from 'vitest';
import { sortGrammageChipOptions } from '@/lib/pos/grammage-chip-sort';

describe('sortGrammageChipOptions', () => {
  it('trie par valeur numérique croissante', () => {
    expect(sortGrammageChipOptions(['300g', '90g', '250g', '115g'])).toEqual([
      '90g',
      '115g',
      '250g',
      '300g',
    ]);
  });

  it('ne trie pas 100g avant 90g comme du texte', () => {
    expect(sortGrammageChipOptions(['100g', '90g', '80g'])).toEqual(['80g', '90g', '100g']);
  });

  it('place Grammage personnalisé en dernier', () => {
    expect(sortGrammageChipOptions(['300g', 'Grammage personnalisé', '230g'])).toEqual([
      '230g',
      '300g',
      'Grammage personnalisé',
    ]);
  });

  it('conserve les grammages épais filtrés dans l’ordre croissant', () => {
    expect(sortGrammageChipOptions(['400g', '300g', '350g', '230g'])).toEqual([
      '230g',
      '300g',
      '350g',
      '400g',
    ]);
  });
});
