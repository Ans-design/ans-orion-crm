import { describe, expect, it } from 'vitest';
import type { ConfigField } from '@/lib/data/config-types';
import {
  isCustomOptionValue,
  resolveCustomFieldKind,
  shouldShowDimensionInputs,
} from '@/lib/pos/custom-field-ui';

const field = (key: string, customInput?: ConfigField['customInput']): ConfigField => ({
  key,
  label: key,
  type: 'chips',
  customInput,
});

describe('custom-field-ui', () => {
  it('detects custom option values', () => {
    expect(isCustomOptionValue('Autres')).toBe(true);
    expect(isCustomOptionValue('Format personnalisé')).toBe(true);
    expect(isCustomOptionValue('100 feuilles')).toBe(false);
  });

  it('nombre_feuilles → quantity, not dimension', () => {
    expect(resolveCustomFieldKind(field('nombre_feuilles'))).toBe('quantity');
    expect(shouldShowDimensionInputs(field('nombre_feuilles'), 'Autres')).toBe(false);
  });

  it('format → dimension kind (legacy sans productConfig)', () => {
    expect(resolveCustomFieldKind(field('format'))).toBe('dimension');
    expect(shouldShowDimensionInputs(field('format'), 'Autres')).toBe(true);
    expect(shouldShowDimensionInputs(field('format'), 'Format personnalisé')).toBe(true);
  });

  it('grammage → grammage input', () => {
    expect(resolveCustomFieldKind(field('grammage_interieur'))).toBe('grammage');
    expect(shouldShowDimensionInputs(field('grammage_interieur'), 'Autres')).toBe(false);
  });

  it('matiere → material text', () => {
    expect(resolveCustomFieldKind(field('famille_papier'))).toBe('material');
  });

  it('type_reliure → binding', () => {
    expect(resolveCustomFieldKind(field('type_reliure'))).toBe('binding');
  });

  it('respects explicit customInput override', () => {
    expect(resolveCustomFieldKind(field('format', 'text'))).toBe('text');
    expect(shouldShowDimensionInputs(field('format', 'text'), 'Autres')).toBe(false);
  });
});
