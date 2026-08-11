import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import { PHOTO_POS_FORMAT_CHIPS, PHOTOBOOK_POS_FORMAT_CHIPS } from '@/lib/pricing/photo-format-equivalences';
import { sortFormatsForPOS } from '@/lib/pos/format-chip-sort';

function fieldOptions(articleId: string, fieldKey: string): string[] {
  const cfg = filterProductConfigForPos(getProductConfig(articleId), {
    articleId,
    category: 'photo',
  });
  for (const section of cfg?.sections ?? []) {
    const field = section.fields.find((f) => f.key === fieldKey);
    if (field?.options) return field.options;
  }
  return [];
}

describe('photo POS', () => {
  it('tirage — formats mm croissants, sans cm', () => {
    const formats = fieldOptions('ph-tirage', 'format');
    expect(formats).toEqual([...PHOTO_POS_FORMAT_CHIPS]);
    expect(formats.some((f) => /\bcm\b/i.test(f))).toBe(false);
    expect(formats[formats.length - 1]).toBe('Format personnalisé');
  });

  it('cadre — mêmes formats mm', () => {
    const formats = fieldOptions('ph-cadre', 'format');
    expect(formats).toContain('145×145 mm');
    expect(formats).toContain('295×295 mm');
    expect(formats).not.toContain('14,5×14,5 cm');
    expect(formats.some((f) => /\bcm\b/i.test(f))).toBe(false);
  });

  it('photobook — mm, ordre taille réelle', () => {
    const formats = fieldOptions('ph-photobook', 'format');
    expect(formats).toEqual(sortFormatsForPOS([...PHOTOBOOK_POS_FORMAT_CHIPS]));
    expect(formats).toContain('145×145 mm');
    expect(formats).toContain('200×200 mm');
    expect(formats).not.toContain('Mini — 15×15 cm');
    expect(formats.some((f) => /\bcm\b/i.test(f))).toBe(false);
  });
});
