import { beforeAll, describe, expect, it } from 'vitest';
import {
  computeCadrePhotoPrice,
  setBlankFramesRuntime,
  setCadrePhotoRuleRuntime,
  DEFAULT_CADRE_PHOTO_RULE,
} from '@/lib/pricing/cadre-photo-pricing';
import { DEFAULT_BLANK_FRAMES } from '@/lib/pricing/blank-frame-rules';
import {
  setTiragePhotoRuntimeParams,
  DEFAULT_TIRAGE_PHOTO_PARAMS,
} from '@/lib/pricing/tirage-photo-pricing';
import { setImpressionSfRuntimeRules } from '@/lib/pricing/impression-sf-pricing';
import { DEFAULT_PAPER_FORMAT_RULES } from '@/lib/pricing/paper-format-rules';
import { CATALOGUE } from '@/lib/data/catalogue';
import { getProductConfig } from '@/lib/data/config-types';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';

describe('Cadre photo — hybride cadre + tirage', () => {
  beforeAll(() => {
    setImpressionSfRuntimeRules({ formatRules: DEFAULT_PAPER_FORMAT_RULES });
    setTiragePhotoRuntimeParams(DEFAULT_TIRAGE_PHOTO_PARAMS);
    setBlankFramesRuntime(DEFAULT_BLANK_FRAMES);
    setCadrePhotoRuleRuntime(DEFAULT_CADRE_PHOTO_RULE);
  });

  it('Test 1 — Cadre bois A4 = 12000 + 3000 = 15000', () => {
    const res = computeCadrePhotoPrice({ type: 'Cadre bois', format: 'A4' });
    expect(res.calculable).toBe(true);
    expect(res.breakdown!.prixCadreVierge).toBe(12000);
    expect(res.breakdown!.prixTiragePhoto).toBe(3000);
    expect(res.prixUnitaire).toBe(15000);
  });

  it('Test 2 — Cadre plastique A5 = 8000 + 1500 = 9500 (A4/2 sans découpe)', () => {
    const res = computeCadrePhotoPrice({ type: 'Cadre plastique', format: 'A5' });
    expect(res.breakdown!.prixCadreVierge).toBe(8000);
    expect(res.breakdown!.prixTiragePhoto).toBe(1500);
    expect(res.prixUnitaire).toBe(9500);
  });

  it('Test 3 — changer prix tirage A4 recalcule Cadre photo', () => {
    setTiragePhotoRuntimeParams({ prixBaseA4: 3500 });
    const res = computeCadrePhotoPrice({ type: 'Cadre bois', format: 'A4' });
    expect(res.breakdown!.prixTiragePhoto).toBe(3500);
    expect(res.prixUnitaire).toBe(12000 + 3500);
    setTiragePhotoRuntimeParams(DEFAULT_TIRAGE_PHOTO_PARAMS);
  });

  it('Test 4 — changer prix cadre vierge recalcule total', () => {
    const frames = DEFAULT_BLANK_FRAMES.map((f) =>
      f.frameType === 'Cadre bois' && f.formatLabel === 'A4'
        ? { ...f, unitPrice: 13000 }
        : f,
    );
    setBlankFramesRuntime(frames);
    const res = computeCadrePhotoPrice({ type: 'Cadre bois', format: 'A4' });
    expect(res.breakdown!.prixCadreVierge).toBe(13000);
    expect(res.prixUnitaire).toBe(16000);
    setBlankFramesRuntime(DEFAULT_BLANK_FRAMES);
  });

  it('Test 5 — format perso → format supérieur', () => {
    const res = computeCadrePhotoPrice({
      type: 'Cadre bois',
      format: 'Format personnalisé',
      format_largeur: 18,
      format_hauteur: 17,
    });
    expect(res.calculable).toBe(true);
    expect(res.message).toMatch(/format supérieur/i);
    expect(res.breakdown!.formatBilled).toBeTruthy();
  });

  it('Test 6 — type papier sans impact prix', () => {
    const a = computeCadrePhotoPrice({
      type: 'Cadre bois',
      format: 'A4',
      matiere: 'Papier photo brillant',
    });
    const b = computeCadrePhotoPrice({
      type: 'Cadre bois',
      format: 'A4',
      matiere: 'Papier Fine Art',
    });
    expect(a.prixUnitaire).toBe(b.prixUnitaire);
  });

  it('une seule carte catalogue + config POS sans verre', () => {
    expect(CATALOGUE.filter((a) => a.id === 'ph-cadre')).toHaveLength(1);
    const cfg = filterProductConfigForPos(getProductConfig('ph-cadre'));
    expect(cfg?.sections.map((s) => s.title)).toContain('Type papier photo');
    expect(cfg?.sections.map((s) => s.title)).not.toContain('Verre / protection');
    const formats = cfg?.sections.find((s) => s.title.includes('Format'))?.fields[0]?.options ?? [];
    expect(formats).toContain('A4 — 210×297 mm');
    expect(formats).toContain('A2 — 420×594 mm');
    expect(formats).not.toContain('10×15 cm');
    expect(formats[formats.length - 1]).toBe('Format personnalisé');
  });
});
