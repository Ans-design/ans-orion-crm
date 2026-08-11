import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';

describe('calendrier grammages normalisés', () => {
  it('cal-chevalet-table utilise format NNg', () => {
    const cfg = getProductConfig('cal-chevalet-table');
    const grammage = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'grammage');
    const filter = grammage?.optionsFilter?.optionsByValue?.PCB ?? [];
    expect(filter).toContain('250g');
    expect(filter).not.toContain('250 G');
    expect(filter).not.toContain('600 G (300Gx2)');
  });

  it('cal-marquepage — sans Offset, grammages ≥230g', () => {
    const cfg = getProductConfig('cal-marquepage');
    const matiere = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'matiere');
    expect(matiere?.options).toContain('Bristol');
    expect(matiere?.options).not.toContain('Standard / Offset');
    expect(matiere?.options).not.toContain('350g Couché Mat');
    const grammage = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'grammage');
    expect(grammage?.optionsFilter?.optionsByValue?.Glossy).not.toContain('400g');
    expect(grammage?.optionsFilter?.optionsByValue?.Bristol).toContain('230g');
    expect(grammage?.optionsFilter?.optionsByValue?.Bristol).toContain('300g');
  });

  it('cal-plateau — sans bloc sous-main, matières épaisses', () => {
    const cfg = getProductConfig('cal-plateau');
    const titles = cfg?.sections.map((s) => s.title) ?? [];
    expect(titles).not.toContain('Type de calendrier sous-main');
    const matiere = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'matiere');
    expect(matiere?.options).toContain('PCB');
    const grammage = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'grammage');
    expect(grammage?.optionsFilter?.optionsByValue?.PCB).toContain('300g');
    expect(grammage?.optionsFilter?.optionsByValue?.PCB).not.toContain('250g');
  });

  it('cal-chevalet — nombre de feuillets dans configuration', () => {
    const cfg = getProductConfig('cal-chevalet');
    const configSection = cfg?.sections.find((s) => s.title === 'Configuration');
    const feuillets = configSection?.fields.find((f) => f.key === 'feuillets');
    expect(feuillets?.options).toContain('12');
    const keys = cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
    expect(keys).not.toContain('type');
  });
});

describe('événements matière/grammage séparés', () => {
  it('evt-carte-voeux a champ grammage distinct', () => {
    const cfg = getProductConfig('evt-carte-voeux');
    const fields = cfg?.sections.flatMap((s) => s.fields) ?? [];
    expect(fields.some((f) => f.key === 'matiere')).toBe(true);
    expect(fields.some((f) => f.key === 'grammage')).toBe(true);
    const matiere = fields.find((f) => f.key === 'matiere');
    expect(matiere?.options).toContain('PCB');
    expect(matiere?.options).not.toContain('PCB 300g');
  });

  it('evt-billet a PCB + grammage 170g', () => {
    const cfg = getProductConfig('evt-billet');
    const grammage = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'grammage');
    expect(grammage?.optionsFilter?.optionsByValue?.PCB).toContain('170g');
  });
});
