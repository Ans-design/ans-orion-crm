import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { POS_HIDDEN_ARTICLE_IDS } from '@/lib/data/catalogue-meta';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import {
  filterPrintTechnologyOptions,
  isPrintTechnologyAllowed,
} from '@/lib/pos/print-technology-compat';
import {
  filterGlossyGrammageOptions,
  isForbiddenGlossyGrammage,
} from '@/lib/pos/glossy-grammage-policy';
import { filterRetiredMaterialOptions } from '@/lib/pos/retired-material-policy';
import { calculateCalendarMaterialRecap } from '@/lib/calendar/calendar-calculation';

function fieldKeys(articleId: string): string[] {
  const cfg = getProductConfig(articleId);
  return cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
}

function matiereOptions(articleId: string): string[] {
  const cfg = getProductConfig(articleId);
  const mat = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'matiere');
  return mat?.options ?? [];
}

function grammagesForMatiere(articleId: string, matiere: string, grammageKey = 'grammage'): string[] {
  const cfg = getProductConfig(articleId);
  const gram = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === grammageKey);
  return gram?.optionsFilter?.optionsByValue?.[matiere] ?? [];
}

describe('Calendriers — rectifications config', () => {
  it('calendrier mural — crochet, feuillets 6/7/Autres, Glossy 300/600, Offset, sans accroche', () => {
    const cfg = getProductConfig('cal-mural');
    expect(cfg?.posBanner).toBe('Calendrier mural avec crochet');
    const keys = fieldKeys('cal-mural');
    expect(keys).not.toContain('accroche');
    expect(keys).toContain('feuillets_custom');
    const feuillets = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'feuillets');
    expect(feuillets?.options).toEqual(expect.arrayContaining(['6', '7', 'Autres']));
    const matieres = matiereOptions('cal-mural');
    expect(matieres).toContain('Offset');
    expect(matieres).not.toContain('Carte ivoire / SBS');
    expect(grammagesForMatiere('cal-mural', 'Glossy')).toEqual(['300g', '600g', 'Grammage personnalisé']);
  });

  it('calendrier mural — feuillets personnalisés impactent le récap', () => {
    const recap = calculateCalendarMaterialRecap('cal-mural', {
      format: 'A4 — 210×297 mm',
      feuillets: 'Autres',
      feuillets_custom: 9,
      qty: 10,
    });
    expect(recap?.sheetCount).toBe(9);
  });

  it('calendrier plateau — nom, sans feuillets ni reliure, sans Carte ivoire', () => {
    expect(findCatalogueItem('cal-plateau')?.name).toBe('Calendrier plateau');
    const keys = fieldKeys('cal-plateau');
    expect(keys).not.toContain('feuillets');
    expect(keys).not.toContain('reliure');
    expect(matiereOptions('cal-plateau')).not.toContain('Carte ivoire / SBS');
    expect(grammagesForMatiere('cal-plateau', 'Glossy')).not.toContain('400g');
    expect(grammagesForMatiere('cal-plateau', 'Glossy')).not.toContain('700g');
  });

  it('calendrier sous-main masqué du POS actif', () => {
    expect(POS_HIDDEN_ARTICLE_IDS.has('cal-sousmain')).toBe(true);
    expect(getProductConfig('cal-sousmain')).toBeDefined();
  });

  it('chevalet bureau — feuillets à la place du type, socle, rigide luxe, sans socle option', () => {
    const keys = fieldKeys('cal-chevalet');
    expect(keys).not.toContain('type');
    expect(keys).not.toContain('socle');
    const titles = getProductConfig('cal-chevalet')?.sections.map((s) => s.title) ?? [];
    expect(titles).toContain('Socle — Matière & grammage');
    expect(titles).not.toContain('Support — Matière & grammage');
    const feuilletsMat = cfgFeuilletsMatieres('cal-chevalet');
    expect(feuilletsMat).toContain('Rigide luxe');
    expect(grammagesForMatiere('cal-chevalet', 'Offset', 'grammage_feuillets')).toContain('90g');
    expect(matiereOptions('cal-chevalet')).not.toContain('Carte ivoire / SBS');
  });

  it('chevalet table — Glossy sans 350/400/750, sans Carte ivoire', () => {
    const glossy = grammagesForMatiere('cal-chevalet-table', 'Glossy');
    expect(glossy).not.toContain('350g');
    expect(glossy).not.toContain('400g');
    expect(glossy).not.toContain('750g');
    expect(matiereOptions('cal-chevalet-table')).not.toContain('Carte ivoire / SBS');
  });

  it('marque-page — sans Calendrier carte ni Carte ivoire, Glossy sans 400g', () => {
    const typeField = getProductConfig('cal-marquepage')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'type');
    expect(typeField?.options).not.toContain('Calendrier carte');
    expect(matiereOptions('cal-marquepage')).not.toContain('Carte ivoire / SBS');
    expect(grammagesForMatiere('cal-marquepage', 'Glossy')).not.toContain('400g');
  });
});

describe('Règles globales calendrier', () => {
  it('Carte ivoire retirée des options matière', () => {
    expect(filterRetiredMaterialOptions(['PCB', 'Carte ivoire / SBS'])).toEqual(['PCB']);
  });

  it('Glossy — grammages 350/400/700/750 interdits', () => {
    expect(isForbiddenGlossyGrammage('350g')).toBe(true);
    expect(isForbiddenGlossyGrammage('400g')).toBe(true);
    expect(isForbiddenGlossyGrammage('700g')).toBe(true);
    expect(isForbiddenGlossyGrammage('750g')).toBe(true);
    expect(filterGlossyGrammageOptions('Glossy', ['250g', '300g', '350g', '400g', '600g'])).toEqual([
      '250g',
      '300g',
      '600g',
    ]);
  });

  it('PCB et PCM — jet d\'encre interdit', () => {
    const ctx = { matiere: 'PCB', articleId: 'cal-mural' };
    expect(isPrintTechnologyAllowed("Jet d'encre", ctx)).toBe(false);
    expect(isPrintTechnologyAllowed('Offset', ctx)).toBe(true);
    expect(filterPrintTechnologyOptions(['Numérique Laser', "Jet d'encre", 'Offset'], ctx)).toEqual([
      'Numérique Laser',
      'Offset',
    ]);
    expect(isPrintTechnologyAllowed("Jet d'encre", { matiere: 'PCM' })).toBe(false);
  });
});

function cfgFeuilletsMatieres(articleId: string): string[] {
  const cfg = getProductConfig(articleId);
  const mat = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'matiere_feuillets');
  return mat?.options ?? [];
}
