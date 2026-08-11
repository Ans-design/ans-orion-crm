import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';

describe('roll-up & x-banner config', () => {
  it('roll-up types and formats by type', () => {
    const cfg = getProductConfig('plv-rollup');
    const typeField = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'type');
    const formatField = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'format');

    expect(typeField?.options).toEqual([
      'Roll-up standard',
      'Roll-up deluxe / premium',
      'Roll-up mini',
    ]);
    expect(formatField?.optionsFilter?.optionsByValue['Roll-up standard']).toEqual([
      '80×200 cm',
      '85×200 cm',
    ]);
    expect(formatField?.optionsFilter?.optionsByValue['Roll-up deluxe / premium']).toEqual([
      '80×200 cm',
      '85×200 cm',
      '100×200 cm',
      '120×200 cm',
      '150×200 cm',
    ]);
    expect(formatField?.optionsFilter?.optionsByValue['Roll-up mini']).toEqual([
      'A4 — 210×297 mm',
      'A3 — 297×420 mm',
    ]);
  });

  it('roll-up materials are bâche and PP film only, no housse section', () => {
    const cfg = getProductConfig('plv-rollup');
    const keys = cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
    expect(keys).not.toContain('housse');
    const matiere = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'matiere');
    expect(matiere?.options).toEqual(['Bâche', 'PP film indéchirable']);
    const grammageFilter = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'grammage');
    expect(grammageFilter?.optionsFilter?.optionsByValue['Bâche']).toEqual(['440g', '510g']);
    expect(grammageFilter?.optionsFilter?.optionsByValue['PP film indéchirable']).toEqual(['140g']);
  });

  it('x-banner standard and mini with same materials as roll-up', () => {
    const cfg = getProductConfig('plv-xbanner');
    const typeField = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'type');
    expect(typeField?.options).toEqual(['X-Banner standard', 'X-Banner mini']);

    const matiere = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'matiere');
    expect(matiere?.options).toEqual(['Bâche', 'PP film indéchirable']);

    const formatField = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'format');
    expect(formatField?.optionsFilter?.optionsByValue['X-Banner mini']).toEqual([
      'A4 — 210×297 mm',
      'A3 — 297×420 mm',
    ]);
  });
});
