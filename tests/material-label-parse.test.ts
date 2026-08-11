import { describe, expect, it } from 'vitest';
import { parseMaterialLabel, uniqueMaterialKey, uniqueVariantKey } from '@/lib/server/modules/materials/material-label-parse';

describe('material-label-parse', () => {
  it('extrait Glossy 120g en matière + grammage', () => {
    const p = parseMaterialLabel('Glossy 120 G', 'Petit format');
    expect(p.baseName.toLowerCase()).toContain('glossy');
    expect(p.characteristicType).toBe('grammage');
    expect(p.value).toBe('120');
    expect(p.unit).toBe('g');
  });

  it('extrait Acrylic 3mm en épaisseur', () => {
    const p = parseMaterialLabel('Acrylic 3mm');
    expect(p.baseName.toLowerCase()).toBe('acrylic');
    expect(p.characteristicType).toBe('epaisseur');
    expect(p.value).toBe('3');
    expect(p.unit).toBe('mm');
  });

  it('extrait laize 160cm', () => {
    const p = parseMaterialLabel('Laize 160cm', 'Grand format');
    expect(p.characteristicType).toBe('laize');
    expect(p.value).toBe('160');
    expect(p.unit).toBe('cm');
  });

  it('clés uniques matière et déclinaison', () => {
    const base = uniqueMaterialKey('glossy', 'Petit format');
    expect(base).toBe('glossy::petit format');
    const variant = uniqueVariantKey(base, 'grammage', 120, 'g');
    expect(variant).toContain('grammage');
    expect(variant).toContain('120');
  });
});
