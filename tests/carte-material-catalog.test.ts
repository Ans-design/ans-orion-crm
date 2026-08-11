import { describe, expect, it } from 'vitest';
import {
  CARTE_COVER_WEIGHTS,
  CARTE_FIDELITE_MATIERES,
  CARTE_JEUX_MATIERES,
  CARTE_VISITE_MATIERES,
  PCB_PCM_GRAMMAGES,
} from '@/lib/data/carte-cover-material-catalog';
import { BOOK_COVER_MATIERES } from '@/lib/data/book-material-catalog';
import { OFFICIAL_MATERIAL_COMPAT } from '@/lib/data/material-compat-official';
import {
  applyCarteMaterialRules,
  filterCarteFaceOptions,
  filterCarteMatiereOptions,
  isCarteRectoOnlyMatiere,
  isCarteVisiteGrammageTooLight,
  isFideliteForbiddenMatiere,
  isFideliteGrammageTooLight,
} from '@/lib/pos/carte-material-rules';
import { getProductConfig } from '@/lib/data/config-types';

describe('carte-cover-material-catalog', () => {
  it('inclut les matières premium demandées pour carte de visite', () => {
    expect(CARTE_VISITE_MATIERES).toEqual(
      expect.arrayContaining([
        'PVC opaque 1 mm',
        'Papier pelliculé mat',
        'Papier pelliculé brillant',
        'Papier texturé avec motif',
        'Invitation luxe',
        'Kraft',
        'Toile fin',
      ]),
    );
    expect(CARTE_VISITE_MATIERES).not.toContain('PVC translucide 1 mm');
    expect(CARTE_VISITE_MATIERES).not.toContain('PCB 350g');
    expect(CARTE_VISITE_MATIERES).not.toContain('PCB 600g');
  });

  it('PCB et PCM partagent les mêmes grammages carte', () => {
    expect(CARTE_COVER_WEIGHTS.PCB).toEqual([...PCB_PCM_GRAMMAGES]);
    expect(CARTE_COVER_WEIGHTS.PCM).toEqual([...PCB_PCM_GRAMMAGES]);
  });

  it('exclut tout PVC de la carte fidélité', () => {
    expect(CARTE_FIDELITE_MATIERES.some((m) => /pvc/i.test(m))).toBe(false);
    expect(CARTE_FIDELITE_MATIERES.length).toBe(CARTE_VISITE_MATIERES.length - 1);
  });

  it('couverture livre inclut les matières carte + carton rigide', () => {
    expect(BOOK_COVER_MATIERES).toEqual(expect.arrayContaining(['Carton rigide', 'Invitation luxe']));
  });

  it('catalogue officiel DB contient PVC opaque et translucide carte', () => {
    expect(OFFICIAL_MATERIAL_COMPAT.find((m) => m.label === 'PVC opaque 1 mm')).toBeTruthy();
    expect(OFFICIAL_MATERIAL_COMPAT.find((m) => m.label === 'PVC translucide 1 mm')).toBeTruthy();
    expect(OFFICIAL_MATERIAL_COMPAT.find((m) => m.label === 'Kraft')?.grammages).toContain('230g');
  });
});

describe('carte-material-rules', () => {
  it('PVC translucide et Toile fin sont recto uniquement', () => {
    expect(isCarteRectoOnlyMatiere('PVC translucide 1 mm')).toBe(true);
    expect(isCarteRectoOnlyMatiere('Toile fin')).toBe(true);
    expect(isCarteRectoOnlyMatiere('PCB')).toBe(false);
  });

  it('filtre recto-verso pour PVC translucide', () => {
    const opts = filterCarteFaceOptions('PVC translucide 1 mm', ['Recto', 'Recto-verso']);
    expect(opts).toEqual(['Recto']);
  });

  it('interdit PVC pour fidélité', () => {
    expect(isFideliteForbiddenMatiere('PVC opaque 1 mm')).toBe(true);
    const opts = filterCarteMatiereOptions('cv-fidelite', [...CARTE_VISITE_MATIERES]);
    expect(opts.some((o) => /pvc/i.test(o))).toBe(false);
  });

  it('grammage fidélité minimum 250g (sauf Kraft 230g)', () => {
    expect(isFideliteGrammageTooLight('230g', 'PCB')).toBe(true);
    expect(isFideliteGrammageTooLight('230g', 'Kraft')).toBe(false);
    expect(isFideliteGrammageTooLight('300g', 'PCB')).toBe(false);
  });

  it('grammage carte visite minimum 230g', () => {
    expect(isCarteVisiteGrammageTooLight('200g')).toBe(true);
    expect(isCarteVisiteGrammageTooLight('230g')).toBe(false);
    expect(isCarteVisiteGrammageTooLight('300g')).toBe(false);
  });

  it('efface PVC translucide sur carte de visite', () => {
    const next = applyCarteMaterialRules('cv-std', {
      matiere: 'PVC translucide 1 mm',
      face: 'Recto-verso',
    });
    expect(next.matiere).toBe('');
  });

  it('config POS carte visite est résolu', () => {
    expect(getProductConfig('cv-std')).not.toBeNull();
    expect(getProductConfig('cv-std', 'carte_visite')).not.toBeNull();
  });

  it('config carte fidélité sans nombre de cases', () => {
    const cfg = getProductConfig('cv-fidelite');
    const fields = cfg?.sections.flatMap((s) => s.fields) ?? [];
    expect(fields.some((f) => f.key === 'cases')).toBe(false);
    expect(fields.some((f) => f.key === 'coins')).toBe(true);
  });

  it('formats carterie harmonisés', () => {
    const std = getProductConfig('cv-std');
    const fid = getProductConfig('cv-fidelite');
    const stdFormats = std?.sections.find((s) => s.title === 'Format')?.fields[0]?.options ?? [];
    const fidFormats = fid?.sections.find((s) => s.title === 'Format')?.fields[0]?.options ?? [];
    expect(stdFormats).toEqual(fidFormats);
    expect(stdFormats).toContain('85×55 mm');
    expect(stdFormats).toContain('91×55 mm');
    expect(stdFormats).toContain('Carré — 55×55 mm');
  });

  it('jeux de cartes — formats carterie + classiques poker', () => {
    const jeux = getProductConfig('cv-jeux');
    const jeuxFormats = jeux?.sections.find((s) => s.title === 'Format carte')?.fields[0]?.options ?? [];
    expect(jeuxFormats).toContain('85×55 mm');
    expect(jeuxFormats).toContain('Poker — 63×88 mm');
    expect(jeuxFormats).toContain('Bridge — 57×89 mm');
    expect(jeuxFormats).toContain('Tarot — 61×112 mm');
    expect(jeuxFormats.filter((f) => f === 'Format personnalisé')).toHaveLength(1);
  });

  it('jeux de cartes sans finition ni emballage', () => {
    const cfg = getProductConfig('cv-jeux');
    const fields = cfg?.sections.flatMap((s) => s.fields) ?? [];
    expect(fields.some((f) => f.key === 'finition')).toBe(false);
    expect(fields.some((f) => f.key === 'boite')).toBe(false);
    expect(fields.some((f) => f.key === 'matiere')).toBe(true);
  });

  it('jeux de cartes exclut PVC translucide', () => {
    expect(CARTE_JEUX_MATIERES.some((m) => /translucide/i.test(m))).toBe(false);
    const opts = filterCarteMatiereOptions('cv-jeux', [...CARTE_VISITE_MATIERES]);
    expect(opts.some((o) => /translucide/i.test(o))).toBe(false);
  });

  it('bloc-note a matiere_couverture sans papier pelliculé ni papier_couverture', () => {
    const cfg = getProductConfig('bn-bloc-note');
    const fields = cfg?.sections.flatMap((s) => s.fields) ?? [];
    expect(fields.some((f) => f.key === 'matiere_couverture')).toBe(true);
    expect(fields.some((f) => f.key === 'papier_couverture')).toBe(false);
    const matOpts = fields.find((f) => f.key === 'matiere_couverture')?.options ?? [];
    expect(matOpts.some((o) => /pvc translucide/i.test(String(o)))).toBe(true);
    expect(matOpts.some((o) => /pelliculé/i.test(String(o)))).toBe(false);
  });
});
