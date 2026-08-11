import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  applyGlossyMaterialRules,
  filterGlossyGrammageOptions,
  isForbiddenGlossyGrammage,
} from '@/lib/pos/glossy-grammage-policy';
import { resolveGrammageOptions } from '@/lib/pos/grammage-field';

describe('glossy-grammage-policy', () => {
  it('interdit 350g, 400g, 700g et 750g pour Glossy', () => {
    expect(isForbiddenGlossyGrammage('350g')).toBe(true);
    expect(isForbiddenGlossyGrammage('400g')).toBe(true);
    expect(isForbiddenGlossyGrammage('700g')).toBe(true);
    expect(isForbiddenGlossyGrammage('750g')).toBe(true);
    expect(isForbiddenGlossyGrammage('300g')).toBe(false);
    expect(filterGlossyGrammageOptions('Glossy', ['250g', '300g', '350g', 'Grammage personnalisé'])).toEqual([
      '250g',
      '300g',
      'Grammage personnalisé',
    ]);
    expect(filterGlossyGrammageOptions('PCB', ['250g', '300g', '350g'])).toEqual(['250g', '300g', '350g']);
  });

  it('réinitialise grammages Glossy interdits en config', () => {
    const next = applyGlossyMaterialRules({ matiere: 'Glossy', grammage: '400g' });
    expect(next.grammage).toBe('');
  });

  it('catalogue événement carte Glossy sans 350g', () => {
    const cfg = getProductConfig('evt-carte-voeux');
    const section = cfg?.sections.find((s) => s.title.includes('Matière'));
    const filter = section?.fields.find((f) => f.key === 'grammage')?.optionsFilter;
    const glossy = filter?.optionsByValue?.Glossy ?? [];
    expect(glossy).not.toContain('350g');
    expect(glossy).toContain('300g');
  });

  it('resolveGrammageOptions filtre Glossy 350g depuis stock', () => {
    const field = {
      key: 'grammage',
      label: 'Grammage',
      type: 'chips' as const,
      optionsFilter: { field: 'matiere', optionsByValue: { Glossy: ['300g', '350g'] } },
    };
    const opts = resolveGrammageOptions(field, { matiere: 'Glossy' }, {});
    expect(opts).not.toContain('350g');
  });
});
