import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  ORIFLAMME_BASES,
  ORIFLAMME_HEIGHTS_BY_TYPE,
  ORIFLAMME_MATIERES,
  ORIFLAMME_TYPES,
  getOriflammeSpec,
  getOriflammeVoileLabel,
  oriflammeHauteursOptionsByType,
  oriflammeVoileMarginCm,
  parseOriflammeSupportCm,
  parseOriflammeVoileHeightCm,
  parseOriflammeVoileWidthCm,
} from '@/lib/data/oriflamme-catalog';

describe('oriflamme config', () => {
  it('types are goutte, plume, couteaux, rectangle only', () => {
    const cfg = getProductConfig('plv-oriflamme');
    const typeField = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'type');
    expect(typeField?.options).toEqual([...ORIFLAMME_TYPES]);
  });

  it('voile L×H coherent: hauteur voile < hauteur totale, largeur 40–150 cm', () => {
    for (const type of ORIFLAMME_TYPES) {
      for (const { support, voile } of ORIFLAMME_HEIGHTS_BY_TYPE[type]) {
        const total = parseOriflammeSupportCm(support);
        const fabricH = parseOriflammeVoileHeightCm(voile);
        const fabricW = parseOriflammeVoileWidthCm(voile);
        const margin = oriflammeVoileMarginCm(support, voile);

        expect(fabricH).toBeLessThan(total);
        expect(margin).toBeGreaterThanOrEqual(20);
        expect(fabricW).toBeGreaterThanOrEqual(40);
        expect(fabricW).toBeLessThanOrEqual(150);
        expect(fabricH).toBeGreaterThan(fabricW);
      }
    }
  });

  it('goutte Windflag 2,45 m → 75 × 194 cm (not 80 × 240)', () => {
    const spec = getOriflammeSpec('Oriflamme goutte', '2,45 m');
    expect(spec?.voile).toBe('75 × 194 cm');
    expect(parseOriflammeVoileWidthCm(spec!.voile)).toBe(75);
    expect(parseOriflammeVoileHeightCm(spec!.voile)).toBe(194);
    expect(oriflammeVoileMarginCm('2,45 m', '75 × 194 cm')).toBe(51);
  });

  it('plume 2,90 m → 55 × 226 cm (Bikom)', () => {
    expect(getOriflammeVoileLabel('Oriflamme plume', '2,90 m')).toBe('Voile 55 × 226 cm (L × H)');
    expect(parseOriflammeVoileWidthCm('55 × 226 cm')).toBe(55);
  });

  it('plume 2,80 m → 55 × 200 cm (Alibaba / Backdrop)', () => {
    const spec = getOriflammeSpec('Oriflamme plume', '2,80 m');
    expect(spec?.voile).toBe('55 × 200 cm');
    expect(spec?.source).toContain('Alibaba');
  });

  it('couteaux 3,50 m → 85 × 300 cm (Macap potence)', () => {
    const spec = getOriflammeSpec('Oriflamme couteaux', '3,50 m');
    expect(spec?.voile).toBe('85 × 300 cm');
    expect(parseOriflammeVoileWidthCm(spec!.voile)).toBe(85);
    expect(parseOriflammeVoileHeightCm(spec!.voile)).toBe(300);
  });

  it('rectangle 2,30 m → 72 × 182 cm (Printoclock)', () => {
    expect(getOriflammeSpec('Oriflamme rectangle', '2,30 m')?.voile).toBe('72 × 182 cm');
  });

  it('every spec has a source reference', () => {
    for (const type of ORIFLAMME_TYPES) {
      for (const spec of ORIFLAMME_HEIGHTS_BY_TYPE[type]) {
        expect(spec.source.length).toBeGreaterThan(3);
      }
    }
  });

  it('hauteur filtered by type', () => {
    const hauteurField = getProductConfig('plv-oriflamme')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'hauteur');
    expect(hauteurField?.optionsFilter?.optionsByValue).toEqual(oriflammeHauteursOptionsByType());
    expect(hauteurField?.optionsFilter?.optionsByValue['Oriflamme goutte']).toContain('3,50 m');
  });

  it('matieres exclude PVC; base locale avec ciment first', () => {
    const cfg = getProductConfig('plv-oriflamme');
    const tissu = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'tissu');
    const base = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'base');
    expect(tissu?.options).toEqual([...ORIFLAMME_MATIERES]);
    expect(tissu?.options?.some((o) => o.toLowerCase().includes('pvc'))).toBe(false);
    expect(base?.options?.[0]).toBe('Base locale avec ciment');
  });
});
