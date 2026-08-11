import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '@/lib/data/catalogue';
import { getProductConfig } from '@/lib/data/config-types';
import { getGfArticleMeta } from '@/lib/grand-format/article-meta';
import { gfLaizeFallbackLabels } from '@/lib/grand-format/laize-fallbacks';
import {
  injectGfLaizeFallbacksIntoProductConfig,
  laizeChipLabelsFromMerged,
  mergeGfLaizeChipsWithFallback,
} from '@/lib/grand-format/pos-config';
import { resolveBlocNoteMaterialRecap } from '@/lib/pos/bloc-note-material-recap';
import { resolveLivresMaterialRecap } from '@/lib/pos/livres-material-recap';
import { resolvePlvMaterialRecap } from '@/lib/pos/plv-material-recap';
import { resolveCalendarMaterialRecap } from '@/lib/calendar/material-recap';
import { buildEmptyPosConfig } from '@/lib/pos/initial-config';

describe('Audit POS — complétude catalogue', () => {
  const visible = CATALOGUE.filter((a) => !(a as { hidden?: boolean }).hidden);

  it('chaque article visible a un ProductConfig avec sections', () => {
    const missing = visible.filter((a) => {
      const cfg = getProductConfig(a.id, a.configType);
      return !cfg || !cfg.sections?.length;
    });
    expect(missing.map((a) => a.id)).toEqual([]);
  });

  it('grand format — laizes métier injectées dès le chargement (sans API)', () => {
    const gfIds = visible
      .map((a) => a.id)
      .filter((id) => id.startsWith('gf-') && getGfArticleMeta(id));

    for (const id of gfIds) {
      const base = getProductConfig(id);
      const injected = injectGfLaizeFallbacksIntoProductConfig(base, id);
      const laizeField = injected?.sections
        .flatMap((s) => s.fields)
        .find((f) => f.key === 'laize' || f.key === 'laize_plaque');
      const expected = laizeChipLabelsFromMerged(mergeGfLaizeChipsWithFallback(id, []));
      if (expected.length > 1) {
        expect(laizeField?.options, id).toEqual(expected);
      }
    }
  });

  it('vinyle blanc — stock partiel conserve 1 m et 1,50 m', () => {
    const merged = mergeGfLaizeChipsWithFallback('gf-vinyl-blanc', [
      { label: '1m20', cm: 120, available: true, quantity: 5, rupture: false },
    ]);
    const labels = merged.map((l) => l.label);
    expect(labels).toContain('1m');
    expect(labels).toContain('1m50');
    expect(labels).toContain('1m20');
  });

  it('récap matière partiel — familles clés', () => {
    const empty = buildEmptyPosConfig(getProductConfig('bn-bloc-note')!);
    expect(resolveBlocNoteMaterialRecap('bn-bloc-note', empty)?.incomplete).toBe(true);

    const livresCfg = buildEmptyPosConfig(getProductConfig('bk-livres')!);
    expect(resolveLivresMaterialRecap('bk-livres', livresCfg)?.incomplete).toBe(true);

    const plvCfg = buildEmptyPosConfig(getProductConfig('plv-rollup')!);
    expect(resolvePlvMaterialRecap('plv-rollup', plvCfg)?.incomplete).toBe(true);

    const calCfg = buildEmptyPosConfig(getProductConfig('cal-mural')!);
    expect(resolveCalendarMaterialRecap('cal-mural', calCfg)?.incomplete).toBe(true);
  });

  it('dos bleu — laizes 1,20 m et 1,50 m', () => {
    expect(gfLaizeFallbackLabels('gf-dosbleu')).toEqual(expect.arrayContaining(['1m20', '1m50']));
  });
});
