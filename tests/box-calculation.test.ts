import { describe, expect, it } from 'vitest';
import {
  BOX_SHEET_FORMATS,
  calculateBoxPackaging,
  normalizeBoxStructure,
  parseGrammageFromConfig,
  resolveSheetFormat,
} from '@/lib/packaging/box-calculation';
import { getProductConfig } from '@/lib/data/config-types';

const base = { longueur: 100, profondeur: 40, hauteur: 80, grammage: '350g' };

describe('box-calculation', () => {
  it('calcule straight tuck avec marge chute +100 mm', () => {
    const r = calculateBoxPackaging({ ...base, structure: 'Boîte rabats droits' });
    expect(r).not.toBeNull();
    expect(r!.devW).toBe(2 * 100 + 2 * 40 + 15);
    expect(r!.brutW).toBeGreaterThan(r!.devW + 100);
    expect(r!.margeSecurite).toBe(50);
    expect(r!.poidsMatiereG).toBeGreaterThan(0);
  });

  it('calcule fourreau', () => {
    const r = calculateBoxPackaging({ ...base, structure: 'Fourreau' });
    expect(r!.devW).toBe(2 * 40 + 2 * 80 + 15);
    expect(r!.devH).toBe(100);
  });

  it('calcule boîte tiroir en 2 pièces', () => {
    const r = calculateBoxPackaging({ ...base, structure: 'Boîte tiroir' });
    expect(r!.parts).toHaveLength(2);
    expect(r!.surfaceM2).toBeGreaterThan(0);
  });

  it('calcule fond + couvercle', () => {
    const r = calculateBoxPackaging({
      ...base,
      structure: 'Boîte fond + couvercle',
      hauteur_couvercle: 25,
      jeu_couvercle: 2,
    });
    expect(r!.parts).toHaveLength(2);
  });

  it('résout format A3 pour petite boîte', () => {
    const sheet = resolveSheetFormat(200, 150);
    expect(sheet.format?.id).toBeDefined();
    expect(sheet.poses).toBeGreaterThan(0);
  });

  it('grammages boîte > 250g uniquement — Glossy inclut 600g', () => {
    const cfg = getProductConfig('pkg-boite');
    const gramField = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'grammage');
    const glossy = gramField?.optionsFilter?.optionsByValue?.Glossy ?? [];
    expect(glossy).toContain('600g');
    const pcb = gramField?.optionsFilter?.optionsByValue?.PCB ?? [];
    for (const g of pcb) {
      if (g === 'Grammage personnalisé') continue;
      expect(parseInt(g, 10)).toBeGreaterThan(250);
    }
  });

  it('parse grammage config', () => {
    expect(parseGrammageFromConfig({ grammage: 'PCB 300g' })).toBe(300);
  });

  it('normalise legacy Expédition', () => {
    expect(normalizeBoxStructure('Expédition').key).toBe('legacy_expedition');
  });

  it('couvre tous les formats internationaux', () => {
    expect(BOX_SHEET_FORMATS.map((f) => f.id)).toEqual(['A4', 'A3', 'A2', 'A1', 'A0', '2A0', '4A0']);
  });
});
