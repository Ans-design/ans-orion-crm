import { describe, expect, it } from 'vitest';
import { sortFormatChipOptions, sortFormatsForPOS } from '@/lib/pos/format-chip-sort';
import { normalizeDimensionLabel } from '@/lib/dimensions/petit-format-units';
import { PHOTO_POS_FORMAT_CHIPS } from '@/lib/pricing/photo-format-equivalences';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import { getProductConfig } from '@/lib/data/config-types';

describe('sortFormatsForPOS — taille réelle croissante', () => {
  it('CAS 1 — Photo : A6 → 145 → A5 → A4 → 295 → A3 → A3+ → A2 → perso', () => {
    const shuffled = [
      'A2 — 420×594 mm',
      '295×295 mm',
      'A6 — 105×148 mm',
      'Format personnalisé',
      'A3+ — 320×450 mm',
      '145×145 mm',
      'A4 — 210×297 mm',
      'A5 — 148×210 mm',
      'A3 — 297×420 mm',
    ];
    expect(sortFormatsForPOS(shuffled)).toEqual([
      'A6 — 105×148 mm',
      '145×145 mm',
      'A5 — 148×210 mm',
      'A4 — 210×297 mm',
      '295×295 mm',
      'A3 — 297×420 mm',
      'A3+ — 320×450 mm',
      'A2 — 420×594 mm',
      'Format personnalisé',
    ]);
  });

  it('145×145 jamais après A2', () => {
    const out = sortFormatChipOptions(['A2', '145×145 mm', 'A6', 'A5']);
    expect(out.indexOf('145×145 mm')).toBeLessThan(out.indexOf('A2'));
    expect(out.indexOf('145×145 mm')).toBeGreaterThan(out.indexOf('A6'));
  });
});

describe('normalizeDimensionLabel — mm uniquement', () => {
  it('convertit cm → mm', () => {
    expect(normalizeDimensionLabel('14,5×14,5 cm')).toBe('145×145 mm');
    expect(normalizeDimensionLabel('29,5x29,5 cm')).toBe('295×295 mm');
    expect(normalizeDimensionLabel('20×20 cm')).toBe('200×200 mm');
    expect(normalizeDimensionLabel('10×15 cm')).toBe('100×150 mm');
  });

  it('conserve ISO mm', () => {
    expect(normalizeDimensionLabel('A5 — 148×210 mm')).toBe('A5 — 148×210 mm');
    expect(normalizeDimensionLabel('A4')).toMatch(/^A4 — 210×297 mm$/);
  });
});

describe('POS Photo chips', () => {
  it('ordre source + aucun chip cm séparé', () => {
    expect([...PHOTO_POS_FORMAT_CHIPS]).toEqual([
      'A6 — 105×148 mm',
      '145×145 mm',
      'A5 — 148×210 mm',
      'A4 — 210×297 mm',
      '295×295 mm',
      'A3 — 297×420 mm',
      'A3+ — 320×450 mm',
      'A2 — 420×594 mm',
      'Format personnalisé',
    ]);
    expect(PHOTO_POS_FORMAT_CHIPS.some((c) => /\bcm\b/i.test(c))).toBe(false);

    const cfg = filterProductConfigForPos(getProductConfig('ph-tirage'), { articleId: 'ph-tirage', category: 'photo' });
    const formats = cfg?.sections.find((s) => s.title === 'Format')?.fields[0]?.options ?? [];
    expect(formats).toEqual([...PHOTO_POS_FORMAT_CHIPS]);
    expect(formats.some((f) => /\bcm\b/i.test(f))).toBe(false);
  });
});
