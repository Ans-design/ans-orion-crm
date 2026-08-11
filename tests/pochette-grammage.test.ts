import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import type { ConfigField } from '@/lib/data/config-types';
import { resolveGrammageOptions } from '@/lib/pos/grammage-field';

function pochetteGrammageField(): ConfigField {
  const field = getProductConfig('evt-pochette')?.sections
    .flatMap((s) => s.fields)
    .find((f) => f.key === 'grammage');
  if (!field) throw new Error('evt-pochette grammage field missing');
  return field;
}

describe('pochette grammage POS', () => {
  it('config-only : pas de grammages <300g même si le stock en propose', () => {
    const field = pochetteGrammageField();
    const stockCatalogue = {
      PCB: ['90g', '115g', '130g', '135g', '150g', '170g', '250g', '300g', '350g'],
    };

    const opts = resolveGrammageOptions(field, { matiere: 'PCB' }, {});
    expect(opts).toEqual(['300g', '350g', '400g', '600g', '700g', 'Grammage personnalisé']);
    expect(opts.some((g) => /^(90|115|130|135|150|170|250)g$/.test(g))).toBe(false);

    const withStock = resolveGrammageOptions(field, { matiere: 'PCB' }, stockCatalogue);
    expect(withStock).toContain('90g');
  });
});
