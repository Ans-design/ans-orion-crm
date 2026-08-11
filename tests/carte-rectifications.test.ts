import { describe, expect, it } from 'vitest';
import {
  CARTE_COVER_WEIGHTS,
  CARTE_FIDELITE_WEIGHTS,
  CARTE_TRANSLUCIDE_MATIERE,
  CARTE_VISITE_MATIERES,
} from '@/lib/data/carte-cover-material-catalog';
import { DEFAULT_MATERIALS } from '@/lib/data/materials-config';
import { getProductConfig } from '@/lib/data/config-types';
import { formatPosFieldDisplay } from '@/lib/pos/field-display';
import { sortGrammageChipOptions } from '@/lib/pos/grammage-chip-sort';
import {
  applyCarteMaterialRules,
  filterCarteGrammageOptions,
  filterCarteMatiereOptions,
  isFideliteGrammageTooLight,
} from '@/lib/pos/carte-material-rules';
import { filterThickPaperGrammageOptions } from '@/lib/pos/thick-paper-grammage-policy';

function fideliteGrammageOptions(matiere: string): string[] {
  const cfg = getProductConfig('cv-fidelite');
  const section = cfg?.sections.find((s) => s.title === 'Matière & grammage');
  const gram = section?.fields.find((f) => f.key === 'grammage');
  const raw = gram?.optionsFilter?.optionsByValue?.[matiere] ?? [];
  return filterCarteGrammageOptions('cv-fidelite', matiere, raw, 'grammage');
}

describe('Carte de fidélité — rectifications', () => {
  it('Kraft 230g est disponible et trié croissant', () => {
    const opts = sortGrammageChipOptions(fideliteGrammageOptions('Kraft'));
    expect(opts).toContain('230g');
    expect(opts).toContain('250g');
    expect(opts).toContain('300g');
    const numeric = opts.filter((o) => /\d+g/.test(o));
    expect(numeric).toEqual(['230g', '250g', '300g']);
  });

  it('Kraft 230g n’est pas rejeté par les règles fidélité', () => {
    expect(isFideliteGrammageTooLight('230g', 'Kraft')).toBe(false);
    expect(isFideliteGrammageTooLight('200g', 'Kraft')).toBe(true);
    const next = applyCarteMaterialRules('cv-fidelite', {
      matiere: 'Kraft',
      grammage: '230g',
    });
    expect(next.grammage).toBe('230g');
  });

  it('autres matières fidélité restent au minimum 250g', () => {
    expect(isFideliteGrammageTooLight('230g', 'PCB')).toBe(true);
    expect(isFideliteGrammageTooLight('250g', 'PCB')).toBe(false);
    const filtered = filterThickPaperGrammageOptions(
      'cv-fidelite',
      ['230g', '250g', '300g'],
      'grammage',
    );
    expect(filtered).toEqual(['250g', '300g']);
  });

  it('Toile fin affiche uniquement Blanc et Beige', () => {
    expect(CARTE_FIDELITE_WEIGHTS['Toile fin']).toEqual(['Blanc', 'Beige']);
    expect(CARTE_COVER_WEIGHTS['Toile fin']).toEqual(['270g', 'Grammage personnalisé']);
    const opts = fideliteGrammageOptions('Toile fin');
    expect(opts).toEqual(['Blanc', 'Beige']);
  });

  it('Blanc et Beige n’impactent pas le prix par défaut (pas de forcePriceValues)', () => {
    const cfg = getProductConfig('cv-fidelite');
    const gram = cfg?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'grammage');
    expect(gram?.forcePriceValues ?? []).not.toContain('Blanc');
    expect(gram?.forcePriceValues ?? []).not.toContain('Beige');
  });

  it('récap affiche la base toile choisie', () => {
    const cfg = getProductConfig('cv-fidelite');
    const gramField = cfg?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'grammage');
    expect(gramField).toBeDefined();
    expect(
      formatPosFieldDisplay(gramField!, 'Blanc', { matiere: 'Toile fin' }),
    ).toBe('Base toile : Blanc');
    expect(
      formatPosFieldDisplay(gramField!, 'Beige', { matiere: 'Toile fin' }),
    ).toBe('Base toile : Beige');
  });

  it('efface un ancien grammage 270g sur Toile fin fidélité', () => {
    const next = applyCarteMaterialRules('cv-fidelite', {
      matiere: 'Toile fin',
      grammage: '270g',
    });
    expect(next.grammage).toBe('');
  });
});

describe('Carte de visite — rectifications', () => {
  it('PVC translucide 1 mm est retiré des matières visite', () => {
    expect(CARTE_VISITE_MATIERES).not.toContain(CARTE_TRANSLUCIDE_MATIERE);
    expect(CARTE_VISITE_MATIERES).toContain('PVC opaque 1 mm');
    const opts = filterCarteMatiereOptions('cv-std', [...CARTE_VISITE_MATIERES, CARTE_TRANSLUCIDE_MATIERE]);
    expect(opts).not.toContain(CARTE_TRANSLUCIDE_MATIERE);
  });

  it('PVC translucide retiré des seeds actifs', () => {
    const transl = DEFAULT_MATERIALS.find((m) => m.id === 'carte-pvc-transl');
    expect(transl?.actif).toBe(false);
  });

  it('efface PVC translucide sur nouvelle config carte visite', () => {
    const next = applyCarteMaterialRules('cv-std', {
      matiere: CARTE_TRANSLUCIDE_MATIERE,
      grammage: '1 mm',
      face: 'Recto',
    });
    expect(next.matiere).toBe('');
    expect(next.grammage).toBe('');
  });

  it('autres options PVC translucide (couvertures) restent dans le catalogue', () => {
    expect(CARTE_COVER_WEIGHTS[CARTE_TRANSLUCIDE_MATIERE]).toEqual(['1 mm']);
  });
});
