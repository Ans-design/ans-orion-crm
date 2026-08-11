import { beforeAll, describe, expect, it } from 'vitest';
import {
  computeTiragePhotoPrice,
  setTiragePhotoRuntimeParams,
  DEFAULT_TIRAGE_PHOTO_PARAMS,
  resolveTiragePhotoFormat,
  PH_TIRAGE_ID,
  isTiragePhotoArticleId,
} from '@/lib/pricing/tirage-photo-pricing';
import { setImpressionSfRuntimeRules } from '@/lib/pricing/impression-sf-pricing';
import { DEFAULT_PAPER_FORMAT_RULES } from '@/lib/pricing/paper-format-rules';
import { CATALOGUE } from '@/lib/data/catalogue';
import { POS_HIDDEN_ARTICLE_IDS } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import { PH_TIRAGE_LEGACY_IDS } from '@/lib/pricing/tirage-photo-pricing';
import { resolveTiragePhotoCanonicalId } from '@/lib/pos/tirage-photo-catalog';
import {
  setPhotoFormatEquivalencesRuntime,
  DEFAULT_PHOTO_FORMAT_EQUIVALENCES,
} from '@/lib/pricing/photo-format-equivalences';

describe('Tirage photo — une carte + prix A4 ISF', () => {
  beforeAll(() => {
    setImpressionSfRuntimeRules({ formatRules: DEFAULT_PAPER_FORMAT_RULES });
    setTiragePhotoRuntimeParams(DEFAULT_TIRAGE_PHOTO_PARAMS);
    setPhotoFormatEquivalencesRuntime(DEFAULT_PHOTO_FORMAT_EQUIVALENCES);
  });

  it('Test 1 — une seule carte catalogue Tirage photo', () => {
    const tirages = CATALOGUE.filter((a) => /tirage photo/i.test(a.name));
    expect(tirages).toHaveLength(1);
    expect(tirages[0]!.id).toBe(PH_TIRAGE_ID);
    for (const id of PH_TIRAGE_LEGACY_IDS) {
      expect(POS_HIDDEN_ARTICLE_IDS.has(id)).toBe(true);
      expect(resolveTiragePhotoCanonicalId(id)).toBe(PH_TIRAGE_ID);
    }
  });

  it('Test 2 — A4 = 3000', () => {
    const res = computeTiragePhotoPrice({ format: 'A4' });
    expect(res.calculable).toBe(true);
    expect(res.prixUnitaire).toBe(3000);
  });

  it('Test 3 — A5 = 1500 (A4/2 sans découpe)', () => {
    const res = computeTiragePhotoPrice({ format: 'A5' });
    expect(res.prixUnitaire).toBe(1500);
  });

  it('Test 4 — A6 = 800', () => {
    const res = computeTiragePhotoPrice({ format: 'A6' });
    expect(res.prixUnitaire).toBe(800);
  });

  it('Test 5 — A3 = 6000', () => {
    const res = computeTiragePhotoPrice({ format: 'A3' });
    expect(res.prixUnitaire).toBe(6000);
  });

  it('Test 6 — type papier sans impact prix', () => {
    const a = computeTiragePhotoPrice({ format: 'A4', matiere: 'Papier photo brillant' });
    const b = computeTiragePhotoPrice({ format: 'A4', matiere: 'Photo tissu' });
    const c = computeTiragePhotoPrice({ format: 'A4', matiere: 'Papier Fine Art' });
    expect(a.prixUnitaire).toBe(3000);
    expect(b.prixUnitaire).toBe(a.prixUnitaire);
    expect(c.prixUnitaire).toBe(a.prixUnitaire);
  });

  it('Test 7 — pas de pelliculage dans le configurateur POS', () => {
    const cfg = filterProductConfigForPos(getProductConfig('ph-tirage'));
    const allOpts = (cfg?.sections ?? []).flatMap((s) =>
      s.fields.flatMap((f) => f.options ?? []),
    );
    expect(allOpts.some((o) => /pellicul/i.test(o))).toBe(false);
    expect(cfg?.sections.map((s) => s.title)).not.toContain('Finition');
    expect(isTiragePhotoArticleId('ph-tirage')).toBe(true);
  });

  it('Test 8 — format perso → format supérieur', () => {
    expect(resolveTiragePhotoFormat(150, 150).formatCode).toBe('A5');
    const res = computeTiragePhotoPrice({
      format: 'Format personnalisé',
      format_largeur: 200,
      format_hauteur: 250,
    });
    expect(res.breakdown?.formatUsed).toBe('A4');
    expect(res.prixUnitaire).toBe(3000);

    const a3p = computeTiragePhotoPrice({
      format: 'Format personnalisé',
      format_largeur: 300,
      format_hauteur: 440,
    });
    expect(a3p.breakdown?.formatUsed).toBe('A3+');
  });

  it('Test 9 — changer prix A4 recalcule les formats', () => {
    setTiragePhotoRuntimeParams({ prixBaseA4: 4000 });
    expect(computeTiragePhotoPrice({ format: 'A4' }).prixUnitaire).toBe(4000);
    expect(computeTiragePhotoPrice({ format: 'A5' }).prixUnitaire).toBe(2000);
    expect(computeTiragePhotoPrice({ format: 'A6' }).prixUnitaire).toBe(1050);
    setTiragePhotoRuntimeParams(DEFAULT_TIRAGE_PHOTO_PARAMS);
  });

  it('Test 10 — A3+ = 6200', () => {
    expect(computeTiragePhotoPrice({ format: 'A3+' }).prixUnitaire).toBe(6200);
  });
});

describe('Tirage photo — calculatePrice ne doit plus renvoyer 350', () => {
  it('A4 via calculatePrice = 3000 (pas dynamicPrixBase 350)', async () => {
    const { calculatePrice } = await import('@/lib/pricing/calculate');
    const { setImpressionSfRuntimeRules } = await import('@/lib/pricing/impression-sf-pricing');
    const { DEFAULT_PAPER_FORMAT_RULES } = await import('@/lib/pricing/paper-format-rules');
    setImpressionSfRuntimeRules({ formatRules: DEFAULT_PAPER_FORMAT_RULES });
    setTiragePhotoRuntimeParams(DEFAULT_TIRAGE_PHOTO_PARAMS);

    const r = await calculatePrice(
      'ph-tirage',
      { format: 'A4', qty: 1, matiere: 'Papier photo brillant' },
      { skipDynamic: false },
    );
    expect(r).not.toBeNull();
    expect(r!.prixUnitaire).toBe(3000);
    expect(r!.prixUnitaire).not.toBe(350);
    expect(String(r!.snapshot?.priceSource ?? '')).toMatch(/tiragePhoto/);
  }, 15_000);
});
