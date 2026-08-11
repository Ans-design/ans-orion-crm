import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';

function sectionTitles(articleId: string): string[] {
  const cfg = filterProductConfigForPos(getProductConfig(articleId), { articleId });
  return cfg?.sections.map((s) => s.title) ?? [];
}

function fieldOptions(articleId: string, fieldKey: string): string[] {
  const cfg = filterProductConfigForPos(getProductConfig(articleId), { articleId });
  for (const section of cfg?.sections ?? []) {
    const field = section.fields.find((f) => f.key === fieldKey);
    if (field?.options) return field.options;
  }
  return [];
}

describe('événementiel POS', () => {
  it('badge — sans Badge tissu', () => {
    expect(fieldOptions('evt-badge', 'type')).not.toContain('Badge tissu');
  });

  it('billet — sans type, avec PCM et Glossy', () => {
    expect(sectionTitles('evt-billet')).not.toContain('Type de billet');
    const matieres = getProductConfig('evt-billet')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'matiere');
    expect(matieres?.options).toContain('PCM');
    expect(matieres?.options).toContain('Glossy');
  });

  it('bracelet — sans RFID ni fermeture', () => {
    expect(fieldOptions('evt-bracelet', 'type')).not.toContain('Bracelet RFID / NFC');
    expect(sectionTitles('evt-bracelet')).not.toContain('Fermeture');
  });

  it('carte de vœux — sans type ni enveloppe, avec Glossy', () => {
    expect(sectionTitles('evt-carte-voeux')).not.toContain('Type de carte de vœux');
    expect(sectionTitles('evt-carte-voeux')).not.toContain('Enveloppe');
    const matieres = getProductConfig('evt-carte-voeux')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'matiere');
    expect(matieres?.options).toContain('Glossy');
  });

  it('chèque — grands formats, PCM/Glossy, sans valeur faciale', () => {
    expect(sectionTitles('evt-cheque')).not.toContain('Valeur faciale');
    const formats = fieldOptions('evt-cheque', 'format');
    // ISO chips enrichis en mm (même règle photo/petit format) ; grands formats restés en cm
    expect(formats[0]).toMatch(/^A4\b/);
    expect(formats.some((f) => /^A0\b/.test(f))).toBe(true);
    expect(formats).toContain('120×40 cm');
    const types = fieldOptions('evt-cheque', 'type');
    expect(types).not.toContain('Chèque à souche');
    expect(types).toContain('Chèque en plexiglas');
  });

  it('cordon — DTF et Flex en technique', () => {
    const tech = fieldOptions('evt-cordon', 'technique');
    expect(tech).toContain('DTF');
    expect(tech).toContain('Flex');
  });

  it('enveloppe — couleur, cire, sans fenêtre', () => {
    expect(sectionTitles('evt-enveloppe')).toContain('Couleur');
    expect(sectionTitles('evt-enveloppe')).not.toContain('Fenêtre');
    expect(fieldOptions('evt-enveloppe', 'fermeture')).toContain('Cire');
    const matieres = getProductConfig('evt-enveloppe')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'matiere');
    expect(matieres?.options).toContain('Papier spécial invitation');
    expect(matieres?.options).toContain('PCB');
    expect(matieres?.options).toContain('PCM');
  });

  it('fanion — PCB, PCM, Glossy, Offset', () => {
    const matieres = fieldOptions('evt-fanion', 'matiere');
    expect(matieres).toContain('PCB');
    expect(matieres).toContain('PCM');
    expect(matieres).toContain('Glossy');
    expect(matieres).toContain('Offset');
  });

  it('photobooth — matière/épaisseur et découpe, sans type', () => {
    expect(sectionTitles('evt-photobooth')).not.toContain('Type de photobooth');
    expect(sectionTitles('evt-photobooth')).toContain('Matière & épaisseur');
    expect(sectionTitles('evt-photobooth')).toContain('Type de découpe');
  });

  it('photocall — sans type, grands formats, local acier', () => {
    expect(sectionTitles('evt-photocall')).not.toContain('Type de photocall');
    const formats = fieldOptions('evt-photocall', 'format');
    expect(formats.length).toBeGreaterThan(5);
    expect(formats[formats.length - 2]).toMatch(/600×300/);
    expect(fieldOptions('evt-photocall', 'structure')).toContain('Local en acier');
    expect(fieldOptions('evt-photocall', 'matiere')).toContain('Plexiglas');
    expect(fieldOptions('evt-photocall', 'matiere')).not.toContain('PVC bâche');
  });

  it('pochette — luxe dos carré, formats ordonnés, grammage >250g, pelliculage', () => {
    expect(fieldOptions('evt-pochette', 'type')).toContain('Pochette à rabat luxe dos carré');
    // DL enrichi mm (aligné chips ISO POS) — premier = plus petit
    expect(fieldOptions('evt-pochette', 'format')[0]).toMatch(/^DL\b/);
    const pcbWeights = getProductConfig('evt-pochette')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'grammage')
      ?.optionsFilter?.optionsByValue?.PCB;
    expect(pcbWeights).not.toContain('250g');
    expect(pcbWeights?.[0]).toBe('300g');
    const pelliculage = fieldOptions('evt-pochette', 'finition_pelliculage');
    expect(pelliculage).toContain('Pelliculage mat');
    expect(pelliculage).toContain('Pelliculage brillant');
  });
});
