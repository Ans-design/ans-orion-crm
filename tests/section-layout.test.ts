import { describe, expect, it } from 'vitest';
import type { ConfigField, ConfigSection } from '@/lib/data/config-types';
import {
  fieldGridSpanClass,
  isFieldVisible,
  resolveSectionLayout,
  sectionGridClass,
} from '@/lib/pos/section-layout';

const chip = (key: string, extra: Partial<ConfigField> = {}): ConfigField => ({
  key,
  label: key,
  type: 'chips',
  ...extra,
});

describe('section-layout', () => {
  it('resolves layout from section config or field count', () => {
    const section: ConfigSection = { title: 'T', icon: '📄', fields: [] };
    expect(resolveSectionLayout({ ...section, layout: 'grid-3' }, 1)).toBe('stack');
    expect(resolveSectionLayout({ ...section, layout: 'grid-3' }, 3)).toBe('grid-3');
    expect(resolveSectionLayout(section, 1)).toBe('stack');
    expect(resolveSectionLayout(section, 2)).toBe('grid-2');
    expect(resolveSectionLayout(section, 5)).toBe('grid-3');
  });

  it('full span for custom values and wide field types', () => {
    expect(fieldGridSpanClass(chip('format'), { format: 'A4' })).toBe('col-span-full');
    expect(fieldGridSpanClass(chip('type_impression'), {})).toBe('col-span-full');
    expect(fieldGridSpanClass(chip('laize_plaque'), {})).toBe('col-span-full');
    expect(fieldGridSpanClass(chip('laize_autre', { type: 'number' }), {})).toBe('col-span-full');
    expect(fieldGridSpanClass({ ...chip('note'), type: 'textarea' }, {})).toBe('col-span-full');
    expect(fieldGridSpanClass({ ...chip('finitions'), type: 'chips_multi' }, {})).toBe('col-span-full');
    expect(fieldGridSpanClass(chip('face'), { face: 'Recto' })).toBe('col-span-full');
    expect(fieldGridSpanClass({ key: 'longueur_mm', label: 'L', type: 'number' }, {})).toBe('');
  });

  it('respects showWhen visibility', () => {
    const field = chip('grammage', { showWhen: { field: 'matiere', values: ['Offset'] } });
    expect(isFieldVisible(field, { matiere: 'Offset' })).toBe(true);
    expect(isFieldVisible(field, { matiere: 'PCB' })).toBe(false);
  });

  it('returns grid classes for grid layouts', () => {
    expect(sectionGridClass('stack')).toContain('space-y');
    expect(sectionGridClass('grid-2')).toContain('grid-cols-2');
    expect(sectionGridClass('grid-3')).toContain('sm:grid-cols-3');
  });
});
