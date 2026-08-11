import { describe, expect, it } from 'vitest';
import {
  normalizeFormatOption,
  dedupeFormatOptions,
  formatIdentityKey,
  findFormatDuplicateGroups,
} from '@/lib/pos/normalize-format-options';
import {
  normalizeFormatAlias,
  getCanonicalFormat,
  getCommercialFormatLabel,
  getPriceEquivalentFormat,
  resolvePriceEquivalentFromDims,
  FORMAT_COMMERCIAL_ALIASES,
} from '@/lib/pos/format-commercial-aliases';
import { resolvePaperFormatForCustomSize } from '@/lib/pricing/paper-format-rules';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import { getProductConfig } from '@/lib/data/config-types';
import { computePaperFormatPrice, findPaperFormatRule } from '@/lib/pricing/paper-format-rules';

describe('FORMAT_COMMERCIAL_ALIASES', () => {
  it('table A5→A0 complète', () => {
    expect(Object.keys(FORMAT_COMMERCIAL_ALIASES)).toEqual(['A5', 'A4', 'A3', 'A2', 'A1', 'A0']);
  });
});

describe('normalizeFormatAlias / getCommercialFormatLabel', () => {
  it('A4 affiche exact + alias commercial + tarif', () => {
    expect(getCommercialFormatLabel('A4')).toBe(
      'A4 — 210×297 mm (≈ 20×30 cm — tarif A4)',
    );
    expect(normalizeFormatAlias('A4')?.priceEquivalent).toBe('A4');
    expect(normalizeFormatAlias('20×30 cm')?.canonicalFormat).toBe('A4');
    expect(normalizeFormatAlias('30×20 cm')?.canonicalFormat).toBe('A4');
    expect(normalizeFormatAlias('200×300 mm')?.canonicalFormat).toBe('A4');
    expect(normalizeFormatAlias('300×200 mm')?.canonicalFormat).toBe('A4');
  });

  it('A3 / A2 / A5 / A1 / A0', () => {
    expect(getCommercialFormatLabel('A3')).toBe(
      'A3 — 297×420 mm (≈ 30×40 cm — tarif A3)',
    );
    expect(getCommercialFormatLabel('A2')).toBe(
      'A2 — 420×594 mm (≈ 40×60 cm — tarif A2)',
    );
    expect(getCanonicalFormat('15×20 cm')).toBe('A5');
    expect(getCanonicalFormat('60×40 cm')).toBe('A2');
    expect(getCanonicalFormat('80×60 cm')).toBe('A1');
    expect(getCanonicalFormat('120×80 cm')).toBe('A0');
    expect(getPriceEquivalentFormat('30×40 cm')).toBe('A3');
  });
});

describe('dedupe — pas de doublon commercial', () => {
  it('une seule chip A4 pour A4 + 20×30 cm + 210×297', () => {
    const out = dedupeFormatOptions([
      'A4',
      '20×30 cm',
      'A4 — 210×297 mm',
      '30×20 cm',
      'Format personnalisé',
    ]);
    expect(out.filter((o) => formatIdentityKey(o) === 'iso:A4')).toHaveLength(1);
    expect(out[0]).toBe('A4 — 210×297 mm (≈ 20×30 cm — tarif A4)');
    expect(out).toContain('Format personnalisé');
  });

  it('identité commune', () => {
    expect(formatIdentityKey('20×30 cm')).toBe(formatIdentityKey('A4'));
    expect(formatIdentityKey('60×40 cm')).toBe(formatIdentityKey('A2'));
  });
});

describe('prix équivalent commercial', () => {
  it('20×30 cm et 30×20 cm = prix A4', () => {
    const a4 = findPaperFormatRule('A4')!;
    const fromCm = resolvePriceEquivalentFromDims(200, 300)!;
    const fromSwap = resolvePriceEquivalentFromDims(300, 200)!;
    expect(fromCm.formatCode).toBe('A4');
    expect(fromSwap.formatCode).toBe('A4');
    const pA4 = computePaperFormatPrice(1000, 'A4').price;
    const pResolved = computePaperFormatPrice(1000, fromCm.formatCode).price;
    expect(pResolved).toBe(pA4);
    expect(a4.formatCode).toBe('A4');
  });

  it('30×40 cm = A3 ; 60×40 cm = A2', () => {
    expect(resolvePaperFormatForCustomSize(300, 400).formatUsed).toBe('A3');
    expect(resolvePaperFormatForCustomSize(600, 400).formatUsed).toBe('A2');
    expect(resolvePaperFormatForCustomSize(150, 200).formatUsed).toBe('A5');
  });

  it('220×310 mm dépasse A4 commercial → format supérieur (pas A4 commercial)', () => {
    const r = resolvePaperFormatForCustomSize(220, 310);
    expect(r.formatUsed).not.toBe('A4');
    expect(r.surDevis).toBe(false);
    expect(r.formatUsed).toBeTruthy();
  });
});

describe('POS configs — libellé commercial unique', () => {
  const articles = [
    'imp-impression',
    'fly-std',
    'bk-livres',
    'ph-tirage',
    'ph-photobook',
    'ph-cadre',
    'cv-std',
    'cal-mural',
  ];

  for (const articleId of articles) {
    it(`${articleId} : A4 unique en mm (sans chip cm séparé)`, () => {
      const cfg = filterProductConfigForPos(getProductConfig(articleId), { articleId });
      const formatField = cfg?.sections
        .flatMap((s) => s.fields)
        .find((f) => f.key === 'format' || f.key === 'dim');
      if (!formatField?.options?.some((o) => /A4/i.test(o))) return;
      const a4s = formatField!.options!.filter((o) => formatIdentityKey(o) === 'iso:A4');
      expect(a4s).toHaveLength(1);
      expect(a4s[0]).toContain('210×297 mm');
      // POS petit format : dims mm uniquement — équiv. cm en facturation, pas dans le chip
      expect(a4s[0]).not.toMatch(/\bcm\b/i);
      expect(findFormatDuplicateGroups(formatField!.options!)).toEqual([]);
      expect(formatField!.options!.some((o) => /^20\s*[×x]\s*30\s*cm$/i.test(o))).toBe(false);
    });
  }
});

describe('normalizeFormatOption legacy', () => {
  it('unifie encore A5 courts', () => {
    expect(normalizeFormatOption('A5')).toBe(
      'A5 — 148×210 mm (≈ 15×20 cm — tarif A5)',
    );
    expect(normalizeFormatOption('148×210 mm')).toBe(
      'A5 — 148×210 mm (≈ 15×20 cm — tarif A5)',
    );
  });
});
