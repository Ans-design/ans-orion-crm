import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';

function fieldKeys(articleId: string): string[] {
  const cfg = getProductConfig(articleId);
  return cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
}

function matiereOptions(articleId: string): string[] {
  const cfg = getProductConfig(articleId);
  const mat = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'matiere');
  return mat?.options ?? [];
}

function grammagesForMatiere(articleId: string, matiere: string): string[] {
  const cfg = getProductConfig(articleId);
  const gram = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'grammage');
  return gram?.optionsFilter?.optionsByValue?.[matiere] ?? [];
}

describe('Packaging — rectifications config', () => {
  it('boîte : sans Carte ivoire, FBB ni Collage — Glossy avec 600g', () => {
    const keys = fieldKeys('pkg-boite');
    expect(keys).not.toContain('collage');
    const matieres = matiereOptions('pkg-boite');
    expect(matieres).not.toContain('Carte ivoire / SBS');
    expect(matieres).not.toContain('FBB');
    expect(matieres).toContain('Glossy');
    expect(matieres).toContain('PCB');
    expect(grammagesForMatiere('pkg-boite', 'Glossy')).toContain('600g');
    expect(grammagesForMatiere('pkg-boite', 'PCB')).not.toContain('600g');
  });

  it('doypack : sans Couleur du support', () => {
    const keys = fieldKeys('pkg-doypack');
    expect(keys).not.toContain('couleur_support');
    expect(keys).not.toContain('custom_color_ref');
    expect(keys).toContain('couleur_doypack');
    expect(keys).toContain('matiere');
  });

  it('doypack : palettes distinctes Kraft / Alu / Plastique (translucides)', () => {
    const cfg = getProductConfig('pkg-doypack');
    const couleur = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'couleur_doypack');
    expect(couleur?.paletteFilter?.field).toBe('matiere');
    const kraft = couleur?.paletteFilter?.palettes.Kraft ?? [];
    const alu = couleur?.paletteFilter?.palettes.Alu ?? [];
    const plastique = couleur?.paletteFilter?.palettes.Plastique ?? [];
    expect(kraft.length).toBeGreaterThanOrEqual(10);
    expect(alu.length).toBeGreaterThanOrEqual(12);
    expect(plastique.length).toBeGreaterThanOrEqual(16);
    expect(kraft.some((c) => /kraft blanc|kraft brun/i.test(c.label))).toBe(true);
    expect(alu.some((c) => /argent mat|or mat|noir soft-touch/i.test(c.label))).toBe(true);
    expect(alu.some((c) => c.badge === 'mat')).toBe(true);
    expect(plastique.filter((c) => c.look === 'translucent' || c.badge === 'translucide').length).toBeGreaterThanOrEqual(6);
    expect(plastique.some((c) => c.badge === 'soft-touch')).toBe(true);
    expect(kraft.map((c) => c.label).sort().join('|')).not.toBe(plastique.map((c) => c.label).sort().join('|'));
  });

  it('étiquette prédécoupée : sans Détails du type', () => {
    const keys = fieldKeys('pkg-etiquette');
    expect(keys).not.toContain('type_details');
    expect(keys).toContain('type_etiquette');
  });

  it('gobelet : sans détails redondants, zone impression seule', () => {
    const keys = fieldKeys('pkg-gobelet');
    expect(keys).not.toContain('type_gobelet_detail');
    expect(keys).not.toContain('matiere_gobelet');
    expect(keys).not.toContain('couleur_gobelet');
    expect(keys).not.toContain('type_impression');
    expect(keys).not.toContain('type_impression_detail');
    expect(keys).not.toContain('contenance_detail');
    expect(keys).toContain('face');
    expect(keys).toContain('zone_impression_longueur');
    expect(keys).toContain('contenance_ml');
    expect(keys).toContain('gobelet_diametre_mm');
    expect(keys).toContain('gobelet_hauteur_mm');
  });

  it('hangtag : grammages ≥ 230g et matières épaisses', () => {
    const matieres = matiereOptions('pkg-hangtag');
    expect(matieres).toContain('Glossy');
    expect(matieres).toContain('PCB');
    expect(matieres).toContain('PCM');
    expect(matieres).toContain('Bristol');
    expect(matieres).toContain('Papier spécial invitation');
    expect(matieres).toContain('Papier recyclé épais');
    expect(matieres).not.toContain('Texturé');
    expect(matieres).not.toContain('Toile fin');

    for (const mat of matieres) {
      for (const g of grammagesForMatiere('pkg-hangtag', mat)) {
        if (g === 'Grammage personnalisé') continue;
        expect(parseInt(g, 10)).toBeGreaterThanOrEqual(230);
      }
    }
  });

  it('sac papier : sans Type de sac, matières PCB/PCM/Glossy/Offset/Kraft', () => {
    const keys = fieldKeys('pkg-sac');
    expect(keys).not.toContain('type_sac');
    expect(keys).not.toContain('type_sac_detail');
    expect(keys).not.toContain('couleur_papier');
    expect(keys).toContain('grammage');

    const matieres = matiereOptions('pkg-sac');
    expect(matieres).toContain('PCB');
    expect(matieres).toContain('PCM');
    expect(matieres).toContain('Glossy');
    expect(matieres).toContain('Offset');
    expect(matieres).toContain('Kraft blanc');
    expect(matieres).toContain('Kraft brun');
    expect(matieres).toContain('Papier recyclé épais');
    expect(matieres).toContain('Papier spécial');
  });
});
