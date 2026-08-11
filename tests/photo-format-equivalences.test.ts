import { beforeAll, describe, expect, it } from 'vitest';
import {
  PHOTO_POS_FORMAT_CHIPS,
  PHOTOBOOK_POS_FORMAT_CHIPS,
  PHOTO_LEGACY_FORMAT_LABELS,
  resolvePhotoCommercialDims,
  resolvePhotoBillingFormat,
  resolvePhotoFormatFromLabel,
  setPhotoFormatEquivalencesRuntime,
  DEFAULT_PHOTO_FORMAT_EQUIVALENCES,
} from '@/lib/pricing/photo-format-equivalences';
import {
  computeTiragePhotoPrice,
  setTiragePhotoRuntimeParams,
  DEFAULT_TIRAGE_PHOTO_PARAMS,
} from '@/lib/pricing/tirage-photo-pricing';
import {
  computePhotobookPrice,
  photobookPagePrice,
  setPhotobookRuntimeParams,
  DEFAULT_PHOTOBOOK_PARAMS,
} from '@/lib/pricing/photobook-pricing';
import { setImpressionSfRuntimeRules } from '@/lib/pricing/impression-sf-pricing';
import { DEFAULT_PAPER_FORMAT_RULES } from '@/lib/pricing/paper-format-rules';
import { getProductConfig } from '@/lib/data/config-types';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';

describe('Formats photo — équivalences métier', () => {
  beforeAll(() => {
    setImpressionSfRuntimeRules({ formatRules: DEFAULT_PAPER_FORMAT_RULES });
    setPhotoFormatEquivalencesRuntime(DEFAULT_PHOTO_FORMAT_EQUIVALENCES);
    setTiragePhotoRuntimeParams(DEFAULT_TIRAGE_PHOTO_PARAMS);
    setPhotobookRuntimeParams(DEFAULT_PHOTOBOOK_PARAMS);
  });

  it('Test 1 — chips POS sans doublons cm, ordre croissant', () => {
    const tirage = filterProductConfigForPos(getProductConfig('ph-tirage'), {
      articleId: 'ph-tirage',
      category: 'photo',
    });
    const opts = tirage?.sections.find((s) => s.title === 'Format')?.fields[0]?.options ?? [];
    expect(opts).toEqual([...PHOTO_POS_FORMAT_CHIPS]);
    for (const legacy of ['10×15 cm', '15×20 cm', '20×30 cm', '14,5×14,5 cm', '29,5×29,5 cm']) {
      expect(opts).not.toContain(legacy);
    }
    expect(opts.some((o) => o.startsWith('A2 — 420×594 mm'))).toBe(true);
    expect(opts).toContain('145×145 mm');
    expect(opts).toContain('295×295 mm');
  });

  it('Test 2–6 — équivalences commerciales → facturation', () => {
    expect(resolvePhotoCommercialDims(150, 200).billingFormat).toBe('A5');
    expect(resolvePhotoCommercialDims(200, 300).billingFormat).toBe('A4');
    expect(resolvePhotoCommercialDims(300, 400).billingFormat).toBe('A3');
    expect(resolvePhotoCommercialDims(300, 450).billingFormat).toBe('A3+');
    expect(resolvePhotoCommercialDims(400, 600).billingFormat).toBe('A2');
    expect(resolvePhotoFormatFromLabel('15×20 cm').billingFormat).toBe('A5');
    expect(resolvePhotoFormatFromLabel('20×30 cm').billingFormat).toBe('A4');
  });

  it('Test 7–8 — carrés 145 / 295 mm (plus 15×15 / 30×30 cm)', () => {
    expect(PHOTO_POS_FORMAT_CHIPS.join('|')).toContain('145×145 mm');
    expect(PHOTO_POS_FORMAT_CHIPS.join('|')).toContain('295×295 mm');
    expect(PHOTO_POS_FORMAT_CHIPS.some((c) => /^\d+\s*[×x]\s*\d+\s*cm$/i.test(c))).toBe(false);
    expect(PHOTOBOOK_POS_FORMAT_CHIPS.join('|')).not.toMatch(/Mini — 15/);
    expect(resolvePhotoCommercialDims(145, 145).billingFormat).toBe('A5');
    expect(resolvePhotoCommercialDims(295, 295).billingFormat).toBe('A3');
    expect(resolvePhotoFormatFromLabel('15×15 cm').billingFormat).toBe('A5');
    expect(resolvePhotoFormatFromLabel('30×30 cm').billingFormat).toBe('A3');
  });

  it('Test 9 — Tirage A4=3000, A2=12000', () => {
    expect(computeTiragePhotoPrice({ format: 'A4 — 210×297 mm' }).prixUnitaire).toBe(3000);
    expect(computeTiragePhotoPrice({ format: 'A2 — 420×594 mm' }).prixUnitaire).toBe(12000);
    expect(computeTiragePhotoPrice({ format: '40×60 cm' }).prixUnitaire).toBe(12000);
    expect(computeTiragePhotoPrice({ format: '20×30 cm' }).prixUnitaire).toBe(3000);
    expect(computeTiragePhotoPrice({ format: '15×20 cm' }).prixUnitaire).toBe(1500);
  });

  it('Test 10 — Photobook A4=4000/page, A2=16000/page', () => {
    expect(photobookPagePrice(4000, 'A4').prixPage).toBe(4000);
    expect(photobookPagePrice(4000, 'A2').prixPage).toBe(16000);
    const book = computePhotobookPrice({
      format: 'A2 — 420×594 mm',
      pages: '1',
      couverture: 'Couverture souple',
    });
    expect(book.breakdown?.prixPage).toBe(16000);
  });

  it('perso 200×300 mm → A4 commercial', () => {
    const r = resolvePhotoBillingFormat(200, 300, DEFAULT_PAPER_FORMAT_RULES);
    expect(r.billingFormat).toBe('A4');
    expect(r.surDevis).toBe(false);
  });

  it('legacy labels listés pour migration', () => {
    expect(PHOTO_LEGACY_FORMAT_LABELS).toContain('10×15 cm');
    expect(PHOTO_LEGACY_FORMAT_LABELS).toContain('15×15 cm');
  });
});
