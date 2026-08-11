import { describe, expect, it } from 'vitest';
import type { ConfigField } from '@/lib/data/config-types';
import {
  grammageEmptyPlaceholder,
  grammageKeyForParent,
  isGrammageFieldKey,
  parentFieldForGrammage,
  resolveGrammageOptions,
} from '@/lib/pos/grammage-field';

const grammageField = (key: string, filterField: string, map: Record<string, string[]>): ConfigField => ({
  key,
  label: 'Grammage',
  type: 'chips',
  options: [],
  optionsFilter: { field: filterField, optionsByValue: map },
});

describe('grammage-field', () => {
  it('maps parent ↔ grammage keys', () => {
    expect(parentFieldForGrammage('grammage_interieur')).toBe('famille_papier');
    expect(parentFieldForGrammage('grammage_couverture')).toBe('matiere_couverture');
    expect(grammageKeyForParent('famille_papier')).toBe('grammage_interieur');
    expect(isGrammageFieldKey('paperWeight')).toBe(true);
  });

  it('returns empty until parent selected when optionsFilter is set', () => {
    const field = grammageField('grammage', 'matiere', { PCB: ['300g'] });
    expect(resolveGrammageOptions(field, {}, {})).toEqual([]);
    expect(resolveGrammageOptions(field, { matiere: 'PCB' }, {})).toEqual(['300g']);
  });

  it('uses contextual placeholder for cover support', () => {
    const field = grammageField('grammage_couverture', 'type_support_couverture', {});
    expect(grammageEmptyPlaceholder(field)).toContain('type de support');
  });
});
