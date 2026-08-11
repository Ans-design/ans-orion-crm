import { describe, expect, it } from 'vitest';
import {
  isRedundantTiragePhotoArticle,
  inferFormatFromRedundantTirageLabel,
  REDUNDANT_TIRAGE_PHOTO_IDS,
} from '@/lib/pos/tirage-photo-redundant';
import { isPosHiddenTirageVariant, POS_HIDDEN_ARTICLE_IDS } from '@/lib/data/catalogue-meta';
import { CATALOGUE } from '@/lib/data/catalogue';
import { buildHybridPosItems, type ProfileSnapshot } from '@/lib/services/catalogue-pos-builder';
import { getProductConfig } from '@/lib/data/config-types';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import {
  computeTiragePhotoPrice,
  setTiragePhotoRuntimeParams,
  DEFAULT_TIRAGE_PHOTO_PARAMS,
} from '@/lib/pricing/tirage-photo-pricing';
import { setImpressionSfRuntimeRules } from '@/lib/pricing/impression-sf-pricing';
import { DEFAULT_PAPER_FORMAT_RULES } from '@/lib/pricing/paper-format-rules';

describe('Fusion Tirage photo — une seule carte POS', () => {
  it('détecte les variantes redondantes, pas le canonique', () => {
    expect(isRedundantTiragePhotoArticle('Tirage photo')).toBe(false);
    expect(isRedundantTiragePhotoArticle('Tirage photo', 'ph-tirage')).toBe(false);
    expect(isRedundantTiragePhotoArticle('Tirage photo A4')).toBe(true);
    expect(isRedundantTiragePhotoArticle('Tirage photo A5', 'AVD033')).toBe(true);
    expect(isRedundantTiragePhotoArticle('Tirage photo A6')).toBe(true);
    expect(isRedundantTiragePhotoArticle('Tirage photo A3 pelliculé', 'AVD035')).toBe(true);
    expect(inferFormatFromRedundantTirageLabel('Tirage photo A4')).toBe('A4');
    expect(POS_HIDDEN_ARTICLE_IDS.has('AVD034')).toBe(true);
    expect(isPosHiddenTirageVariant('AVD032', 'Tirage photo A6')).toBe(true);
    expect(isPosHiddenTirageVariant('ph-tirage', 'Tirage photo')).toBe(false);
  });

  it('catalogue statique : une seule Tirage photo', () => {
    const tirages = CATALOGUE.filter((a) => /^Tirage photo/i.test(a.name));
    expect(tirages).toHaveLength(1);
    expect(tirages[0]!.id).toBe('ph-tirage');
  });

  it('builder hybride exclut AVD032–035 même publiés', () => {
    const profiles: ProfileSnapshot[] = [
      {
        articleId: 'ph-tirage',
        articleLabel: 'Tirage photo',
        family: 'photo',
        prixBase: 3000,
        status: 'published',
        active: true,
        saleUnit: 'pièce',
      },
      {
        articleId: 'AVD034',
        articleLabel: 'Tirage photo A4',
        family: 'photo',
        prixBase: 3000,
        status: 'published',
        active: true,
        saleUnit: 'pièce',
      },
      {
        articleId: 'AVD035',
        articleLabel: 'Tirage photo A3 pelliculé',
        family: 'photo',
        prixBase: 5000,
        status: 'published',
        active: true,
        saleUnit: 'pièce',
      },
    ];
    const items = buildHybridPosItems(profiles, {}, 'commercial', {
      familyToCategoryId: () => 'photo',
      inferConfigType: () => 'photo',
      isVisibleInPos: () => true,
    });
    const photoTirages = items.filter((i) => /^Tirage photo/i.test(i.name));
    expect(photoTirages).toHaveLength(1);
    expect(photoTirages[0]!.id).toBe('ph-tirage');
    expect(items.some((i) => i.id === 'AVD034')).toBe(false);
    expect(REDUNDANT_TIRAGE_PHOTO_IDS.has('AVD035')).toBe(true);
  });

  it('configurateur : formats A4/A5/A6/A3, pas de pelliculage', () => {
    const cfg = filterProductConfigForPos(getProductConfig('ph-tirage'), {
      articleId: 'ph-tirage',
      category: 'photo',
    });
    const formats = cfg?.sections.find((s) => s.title === 'Format')?.fields[0]?.options ?? [];
    // Chips mm (A4 — 210×297 mm…) — codes ISO présents, sans pelliculage
    expect(formats.some((f) => /\bA4\b/.test(f))).toBe(true);
    expect(formats.some((f) => /\bA5\b/.test(f))).toBe(true);
    expect(formats.some((f) => /\bA6\b/.test(f))).toBe(true);
    expect(formats.some((f) => /\bA3\b/.test(f) && !/A3\+/.test(f))).toBe(true);
    expect(formats.some((f) => /A3\+/.test(f))).toBe(true);
    expect(formats.some((f) => /pellicul/i.test(f))).toBe(false);
  });

  it('prix A4/A5/A6/A3 + papier sans impact', () => {
    setImpressionSfRuntimeRules({ formatRules: DEFAULT_PAPER_FORMAT_RULES });
    setTiragePhotoRuntimeParams(DEFAULT_TIRAGE_PHOTO_PARAMS);
    expect(computeTiragePhotoPrice({ format: 'A4' }).prixUnitaire).toBe(3000);
    expect(computeTiragePhotoPrice({ format: 'A5' }).prixUnitaire).toBe(1500);
    expect(computeTiragePhotoPrice({ format: 'A6' }).prixUnitaire).toBe(800);
    expect(computeTiragePhotoPrice({ format: 'A3' }).prixUnitaire).toBe(6000);
    const a = computeTiragePhotoPrice({ format: 'A4', matiere: 'Papier photo brillant' });
    const b = computeTiragePhotoPrice({ format: 'A4', matiere: 'Photo tissu' });
    expect(a.prixUnitaire).toBe(b.prixUnitaire);
  });
});
