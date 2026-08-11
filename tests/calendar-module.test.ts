import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { POS_HIDDEN_ARTICLE_IDS } from '@/lib/data/catalogue-meta';
import {
  displayCalendarFormatLabel,
  resolveCalendarDimensionsMm,
  sortFormatLabelsBySurface,
} from '@/lib/calendar/calendar-formats';
import {
  filterCalendarGrammageOptions,
  filterCalendarMaterialOptions,
  isForbiddenMarquepageMaterial,
} from '@/lib/calendar/calendar-material-policy';
import { calculateCalendarMaterialRecap } from '@/lib/calendar/calendar-calculation';
import { buildCalendarCalculationSnapshot, CALENDAR_SNAPSHOT_VERSION } from '@/lib/calendar/calendar-snapshot';

describe('calendar-formats', () => {
  it('remplace SRA3 par A3+ côté affichage', () => {
    expect(displayCalendarFormatLabel('SRA3')).toBe('A3+ — 320×450 mm');
    expect(displayCalendarFormatLabel('A3+ — 320×450 mm')).toBe('A3+ — 320×450 mm');
  });

  it('trie les formats par surface croissante', () => {
    const sorted = sortFormatLabelsBySurface([
      'A3 — 297×420 mm',
      'A4 — 210×297 mm',
      'Format personnalisé',
      'A2 — 420×594 mm',
    ]);
    expect(sorted.indexOf('A4 — 210×297 mm')).toBeLessThan(sorted.indexOf('A3 — 297×420 mm'));
    expect(sorted[sorted.length - 1]).toBe('Format personnalisé');
  });

  it('résout format personnalisé via L×l mm', () => {
    const dims = resolveCalendarDimensionsMm({
      format: 'Format personnalisé',
      longueur: 300,
      largeur: 200,
    });
    expect(dims).toEqual({ widthMm: 300, heightMm: 200, formatLabel: 'Format personnalisé' });
  });
});

describe('calendar-material-policy', () => {
  it('interdit Offset pour marque-page', () => {
    expect(isForbiddenMarquepageMaterial('Offset')).toBe(true);
    expect(isForbiddenMarquepageMaterial('Standard / Offset')).toBe(true);
    expect(isForbiddenMarquepageMaterial('PCB')).toBe(false);
  });

  it('filtre grammages plateau ≥300g', () => {
    const filtered = filterCalendarGrammageOptions(
      'cal-plateau',
      ['250g', '300g', '350g'],
      'grammage',
    );
    expect(filtered).toEqual(['300g', '350g']);
  });

  it('retire Glossy 350g du calendrier', () => {
    const filtered = filterCalendarGrammageOptions(
      'cal-mural',
      ['250g', '300g', '350g'],
      'grammage',
      'Glossy',
    );
    expect(filtered).toEqual(['250g', '300g']);
  });

  it('filtre matières marque-page', () => {
    const filtered = filterCalendarMaterialOptions('cal-marquepage', [
      'PCB',
      'Standard / Offset',
      'Bristol',
    ]);
    expect(filtered).toEqual(['PCB', 'Bristol']);
  });
});

describe('calendar-calculation', () => {
  it('calcule support + feuillets pour chevalet', () => {
    const recap = calculateCalendarMaterialRecap('cal-chevalet', {
      format: 'A5 — 148×210 mm',
      feuillets: '12',
      matiere: 'PCB',
      grammage: '350g',
      face: 'Recto seul',
      qty: 100,
    });
    expect(recap).not.toBeNull();
    expect(recap!.sheetCount).toBe(12);
    expect(recap!.components).toHaveLength(2);
    expect(recap!.grossSurfaceM2).toBeGreaterThanOrEqual(recap!.realSurfaceM2);
    expect(recap!.totalGrossSurfaceM2).toBeCloseTo(recap!.grossSurfaceM2 * 100, 4);
  });

  it('marge format personnalisé +100 mm', () => {
    const recap = calculateCalendarMaterialRecap('cal-plateau', {
      format: 'Format personnalisé',
      longueur: 200,
      largeur: 150,
      feuillets: '12',
      qty: 1,
    });
    expect(recap!.formatBrut).toBe('300 × 250 mm');
  });

  it('alerte si Offset sur marque-page', () => {
    const recap = calculateCalendarMaterialRecap('cal-marquepage', {
      format: '50 × 150 mm',
      matiere: 'Offset',
      grammage: '300g',
      qty: 50,
    });
    expect(recap?.alert).toContain('Offset');
  });
});

describe('calendar config audit', () => {
  it('cal-sousmain archivé — config conservée, masqué du catalogue POS actif', () => {
    expect(POS_HIDDEN_ARTICLE_IDS.has('cal-sousmain')).toBe(true);
    const cfg = getProductConfig('cal-sousmain');
    expect(cfg).toBeDefined();
  });

  it('cal-chevalet-table expose formes 3D', () => {
    const cfg = getProductConfig('cal-chevalet-table');
    const forme = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'forme');
    expect(forme?.options).toContain('Cube');
    expect(forme?.options).toContain('Pyramide');
    expect(forme?.options).not.toContain('Chevalet 12 mois');
  });
});

describe('calendar-snapshot', () => {
  it('construit un snapshot versionné pour devis/commande', () => {
    const snap = buildCalendarCalculationSnapshot('cal-mural', {
      format: 'A3 — 297×420 mm',
      feuillets: '12',
      matiere: 'PCB',
      grammage: '300g',
      face: 'Recto seul',
      qty: 50,
    }, { unitPrice: 12000, prixM2: 19000 });
    expect(snap?.formulaVersion).toBe(CALENDAR_SNAPSHOT_VERSION);
    expect(snap?.numberOfSheets).toBe(12);
    expect(snap?.totalPrice).toBe(snap!.unitPrice * 50);
  });
});
