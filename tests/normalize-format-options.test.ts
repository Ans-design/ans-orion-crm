import { describe, expect, it } from 'vitest';
import {
  normalizeFormatOption,
  dedupeFormatOptions,
  formatIdentityKey,
  findFormatDuplicateGroups,
  dedupeFormatOptionRecords,
} from '@/lib/pos/normalize-format-options';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import { getProductConfig } from '@/lib/data/config-types';
import { findPaperFormatRule } from '@/lib/pricing/paper-format-rules';

const A5 = 'A5 — 148×210 mm (≈ 15×20 cm — tarif A5)';
const A4 = 'A4 — 210×297 mm (≈ 20×30 cm — tarif A4)';
const A3 = 'A3 — 297×420 mm (≈ 30×40 cm — tarif A3)';
const A2 = 'A2 — 420×594 mm (≈ 40×60 cm — tarif A2)';
const A1 = 'A1 — 594×841 mm (≈ 60×80 cm — tarif A1)';
const A0 = 'A0 — 841×1189 mm (≈ 80×120 cm — tarif A0)';
const A3p = 'A3+ — 320×450 mm';
const A6 = 'A6 — 105×148 mm';

describe('normalizeFormatOption', () => {
  it('unifie A5 / A5 148x210 / A5 — 148×210 mm / 148×210 mm', () => {
    expect(normalizeFormatOption('A5')).toBe(A5);
    expect(normalizeFormatOption('A5 148x210')).toBe(A5);
    expect(normalizeFormatOption('A5 — 148×210 mm')).toBe(A5);
    expect(normalizeFormatOption('148×210 mm')).toBe(A5);
    expect(normalizeFormatOption('148x210 mm')).toBe(A5);
  });

  it('canonise la série A complète', () => {
    expect(normalizeFormatOption('A6')).toBe(A6);
    expect(normalizeFormatOption('A4')).toBe(A4);
    expect(normalizeFormatOption('A3')).toBe(A3);
    expect(normalizeFormatOption('A3+')).toBe(A3p);
    expect(normalizeFormatOption('SRA3')).toBe(A3p);
    expect(normalizeFormatOption('A2')).toBe(A2);
    expect(normalizeFormatOption('A1')).toBe(A1);
    expect(normalizeFormatOption('A0')).toBe(A0);
  });

  it('conserve cm libres en keepCm (grand format) hors alias commerciaux', () => {
    expect(normalizeFormatOption('30×60 cm', { keepCm: true })).toBe('30×60 cm');
    expect(normalizeFormatOption('A4', { keepCm: true })).toBe(A4);
    // 20×30 cm = alias A4 même en keepCm
    expect(normalizeFormatOption('20×30 cm', { keepCm: true })).toBe(A4);
  });
});

describe('dedupeFormatOptions', () => {
  it('supprime A5 + A5 — 148×210 mm et trie', () => {
    const out = dedupeFormatOptions([
      'A4',
      'A5 — 148×210 mm',
      'A3 — 297×420 mm',
      'A5',
      'Format personnalisé',
      'A2',
    ]);
    expect(out).toEqual([A5, A4, A3, A2, 'Format personnalisé']);
  });

  it('même identité pour formatIdentityKey', () => {
    expect(formatIdentityKey('A5')).toBe(formatIdentityKey('A5 — 148×210 mm'));
    expect(formatIdentityKey('148×210 mm')).toBe(formatIdentityKey('A5'));
  });

  it('détecte les groupes doublons', () => {
    const groups = findFormatDuplicateGroups(['A5', 'A5 — 148×210 mm', 'A4']);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(expect.arrayContaining(['A5', 'A5 — 148×210 mm']));
  });
});

describe('dedupeFormatOptionRecords (Admin)', () => {
  it('archive le doublon court et garde le canonique', () => {
    const { kept, archived, merges } = dedupeFormatOptionRecords([
      { id: '1', label: 'A5', active: true, priceModifier: 0 },
      { id: '2', label: 'A5 — 148×210 mm', active: true, priceModifier: 100 },
      { id: '3', label: 'A4', active: true },
    ]);
    expect(kept).toHaveLength(2);
    expect(kept.map((k) => k.label)).toEqual([A5, A4]);
    expect(kept.find((k) => k.label.startsWith('A5'))?.priceModifier).toBe(100);
    expect(merges).toHaveLength(1);
    const archivedShort = archived.find((a) => a.id === '1');
    expect(archivedShort).toBeTruthy();
    expect(archivedShort?.active).toBe(false);
  });
});

describe('POS configs — pas de doublons format après filter', () => {
  const articles = [
    'bk-livres',
    'fly-std',
    'ph-tirage',
    'pkg-doypack',
    'cal-mural',
    'cv-std',
    'imp-impression',
    'gf-bache',
    'ph-photobook',
    'ph-cadre',
  ];

  for (const articleId of articles) {
    it(`${articleId} : formats uniques + mm (hors GF cm libres)`, () => {
      const cfg = filterProductConfigForPos(getProductConfig(articleId), { articleId });
      expect(cfg).toBeTruthy();
      for (const section of cfg!.sections) {
        for (const field of section.fields) {
          if (!/format|^dim$/i.test(field.key) || !field.options?.length) continue;
          const groups = findFormatDuplicateGroups(field.options);
          expect(groups, `${articleId}.${field.key} doublons`).toEqual([]);
          for (const opt of field.options) {
            if (/personnalis/i.test(opt)) continue;
            if (articleId.startsWith('gf-') && /\dcm\b/i.test(opt) && !/\(≈/.test(opt)) continue;
            expect(opt).not.toMatch(/^(A[0-7]\+?|DL|B[56])$/i);
          }
        }
      }
    });
  }
});

describe('findPaperFormatRule — libellés longs', () => {
  it('résout A4 — 210×297 mm', () => {
    expect(findPaperFormatRule('A4 — 210×297 mm')?.formatCode).toBe('A4');
    expect(findPaperFormatRule('A5')?.formatCode).toBe('A5');
    expect(findPaperFormatRule(A4)?.formatCode).toBe('A4');
  });
});
