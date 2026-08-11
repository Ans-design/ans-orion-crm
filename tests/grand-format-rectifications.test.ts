import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { gfLaizeFallbackCm, gfLaizeFallbackLabels, sortLaizesCm } from '@/lib/grand-format/laize-fallbacks';
import { getGfArticleMeta } from '@/lib/grand-format/article-meta';
import { computeGrandFormatBillable } from '@/lib/grand-format/pricing';
import { evaluateBache } from '@/lib/grand-format/bache-rules';
import { laizeChipToCm } from '@/lib/print/grand-format-laize-rules';
import { getBacheAvailableLaizesCm } from '@/lib/print/grand-format-laize-rules';

const PERSO = { format: 'Format personnalisé', largeur_cm: 100, hauteur_cm: 200 };

function configFields(articleId: string) {
  const cfg = getProductConfig(articleId);
  return cfg?.sections.flatMap((s) => s.fields) ?? [];
}

describe('Grand Format — rectifications laizes', () => {
  it('Autocollant réfléchissant — laizes 1 m et 1,50 m', () => {
    const cms = gfLaizeFallbackCm('gf-reflechissant');
    expect(cms).toContain(100);
    expect(cms).toContain(150);
    expect(cms).toEqual(sortLaizesCm(cms));
  });

  it('Acrylic / Plexiglas / PVC — laize 2,40 m (240 cm)', () => {
    for (const id of ['gf-acrylic', 'gf-plexi', 'gf-plexi3', 'gf-plexi5', 'gf-pvc', 'gf-pvc3', 'gf-pvc6']) {
      expect(gfLaizeFallbackCm(id)).toContain(240);
    }
  });

  it('Bâche — laizes 1,40 m et 1,80 m', () => {
    const cms = getBacheAvailableLaizesCm('Bâche PVC standard', '440g');
    expect(cms).toContain(140);
    expect(cms).toContain(180);
    expect(gfLaizeFallbackCm('gf-bache')).toEqual(expect.arrayContaining([140, 180]));
  });

  it('Dos bleu — laize 1,20 m', () => {
    expect(gfLaizeFallbackCm('gf-dosbleu')).toContain(120);
  });

  it('PP Film — laize 0,90 m', () => {
    expect(gfLaizeFallbackCm('gf-pp')).toContain(90);
    expect(gfLaizeFallbackLabels('gf-pp')[0]).toBe('0m90');
  });

  it('Toile canvas — laizes 1 m et 1,50 m triées', () => {
    expect(gfLaizeFallbackCm('gf-toile')).toEqual([100, 150]);
  });

  it('Vinyle blanc — laizes 1 m et 1,50 m', () => {
    expect(gfLaizeFallbackCm('gf-vinyl-blanc')).toEqual([100, 150]);
  });

  it('laizes globales triées du plus petit au plus grand', () => {
    const labels = gfLaizeFallbackLabels('gf-bache');
    const cms = labels.map((l) => laizeChipToCm(l)!).filter(Boolean);
    expect(cms).toEqual([...cms].sort((a, b) => a - b));
    expect(labels[0]).toBe('1m');
    expect(labels).toContain('1m40');
    expect(labels).toContain('1m80');
    expect(labels).toContain('2m40');
  });
});

describe('Grand Format — rectifications configurateur', () => {
  it('One-Way Vision — pas de champ grammage', () => {
    const fields = configFields('gf-oneway');
    expect(fields.some((f) => f.key === 'grammage')).toBe(false);
    expect(getGfArticleMeta('gf-oneway')?.fixedGrammage).toBe('140g');
  });

  it('Papier photo — pas de champ grammage', () => {
    const fields = configFields('gf-photo');
    expect(fields.some((f) => f.key === 'grammage')).toBe(false);
    expect(getGfArticleMeta('gf-photo')?.fixedGrammage).toBe('140g');
  });

  it('Vinyle blanc — pas de section Impression recto seul', () => {
    const cfg = getProductConfig('gf-vinyl-blanc');
    const impression = cfg?.sections.find((s) => s.title === 'Impression');
    expect(impression).toBeUndefined();
    expect(configFields('gf-vinyl-blanc').some((f) => f.key === 'face')).toBe(false);
    expect(configFields('gf-vinyl-blanc').some((f) => f.key === 'finition')).toBe(true);
    expect(configFields('gf-vinyl-blanc').some((f) => f.key === 'laize')).toBe(true);
  });

  it('Dos bleu — aspect Mat, Brillant, Satiné sans forcePriceValues', () => {
    const aspect = configFields('gf-dosbleu').find((f) => f.key === 'aspect');
    expect(aspect?.options).toEqual(['Mat', 'Brillant', 'Satiné']);
    expect(aspect?.forcePriceValues ?? []).not.toContain('Mat');
    expect(aspect?.forcePriceValues ?? []).not.toContain('Brillant');
    expect(aspect?.forcePriceValues ?? []).not.toContain('Satiné');
  });

  it('Toile canvas — section laize présente', () => {
    expect(configFields('gf-toile').some((f) => f.key === 'laize')).toBe(true);
  });
});

describe('Grand Format — prix automatique', () => {
  it('Bâche — surface laize avec nouvelle laize 1,40 m', () => {
    const ev = evaluateBache({
      type_bache: 'Bâche PVC standard',
      grammage: '440g',
      format: 'Format personnalisé',
      longueur_cm: 200,
      largeur_cm: 130,
      laize: '1m40',
      dos: 'Dos blanc',
      aspect: 'Mat',
      qty: 1,
      face: 'Recto seul',
    }, { prixM2: 10000 });
    expect(ev.valid).toBe(true);
    expect(ev.laizeM).toBe(1.4);
    expect(ev.surfaceLaizeM2).toBeGreaterThan(0);
    expect(ev.finalTotal).toBeGreaterThan(0);
  });

  it('Réfléchissant — prix avec laize 1 m', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, laize: '1m' },
      availableLaizesCm: gfLaizeFallbackCm('gf-reflechissant'),
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.prixUnitaire).toBeGreaterThan(0);
    expect(bill.laizeUtiliseeCm).toBe(100);
  });
});
