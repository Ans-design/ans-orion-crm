import { beforeEach, describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  BLOC_NOTE_COVER_MATIERES,
  BLOC_NOTE_COVER_WEIGHTS,
  BLOC_NOTE_INTERIOR_WEIGHTS,
} from '@/lib/data/carte-cover-material-catalog';
import {
  filterGlossyGrammageOptions,
  isForbiddenGlossyGrammage,
} from '@/lib/pos/glossy-grammage-policy';
import {
  computeBlocNotePrice,
  parseBlocNoteSheetCount,
} from '@/lib/pricing/bloc-note-pricing';
import { calculateBlocNoteMaterialRecap } from '@/lib/pricing/bloc-note-material-recap';
import { parsePagesFromConfig } from '@/lib/data/binding-catalog';
import {
  resetPublicationRuntimeParams,
  setPublicationRuntimeParams,
} from '@/lib/pricing/publication-pricing-rules';

function fieldKeys(articleId: string): string[] {
  const cfg = getProductConfig(articleId);
  return cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
}

function sectionTitles(articleId: string): string[] {
  return getProductConfig(articleId)?.sections.map((s) => s.title) ?? [];
}

function fieldOptions(articleId: string, key: string): string[] {
  const cfg = getProductConfig(articleId);
  const field = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === key);
  return field?.options ?? [];
}

function grammagesForFamille(articleId: string, famille: string): string[] {
  const cfg = getProductConfig(articleId);
  const gram = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'grammage_interieur');
  return gram?.optionsFilter?.optionsByValue?.[famille] ?? [];
}

describe('Bloc-note & Agenda — rectifications config', () => {
  it('sections séparées — couverture, intérieur, impression, nombre de pages', () => {
    const titles = sectionTitles('bn-bloc-note');
    expect(titles).toContain('Couverture');
    expect(titles).toContain('Intérieur');
    expect(titles).toContain('Impression intérieur');
    expect(titles).toContain('Nombre de pages');
    expect(titles).not.toContain('Papier & impression');
  });

  it('supprime papier couverture et variantes redondantes', () => {
    const keys = fieldKeys('bn-bloc-note');
    expect(keys).not.toContain('papier_couverture');
  });

  it('couverture — PVC translucide disponible, sans papier pelliculé', () => {
    expect(BLOC_NOTE_COVER_MATIERES.some((m) => /pvc translucide/i.test(m))).toBe(true);
    expect(BLOC_NOTE_COVER_MATIERES.some((m) => /pelliculé/i.test(m))).toBe(false);
    const matOpts = fieldOptions('bn-bloc-note', 'matiere_couverture');
    expect(matOpts.some((o) => /pvc translucide/i.test(o))).toBe(true);
    expect(matOpts.some((o) => /pelliculé/i.test(o))).toBe(false);
  });

  it('grammage couverture Glossy — 600g autorisé, 350/400/700/750 interdits', () => {
    const glossy = BLOC_NOTE_COVER_WEIGHTS.Glossy;
    expect(glossy).toContain('600g');
    expect(filterGlossyGrammageOptions('Glossy', glossy)).toEqual(
      expect.arrayContaining(['250g', '300g', '600g']),
    );
    expect(isForbiddenGlossyGrammage('350g')).toBe(true);
    expect(isForbiddenGlossyGrammage('750g')).toBe(true);
  });

  it('intérieur — PCM et papier spécial invitation', () => {
    const familles = fieldOptions('bn-bloc-note', 'famille_papier');
    expect(familles).toContain('PCM');
    expect(familles).toContain('Papier spécial invitation');
  });

  it('invitation intérieur — grammages < 300g triés', () => {
    const grams = grammagesForFamille('bn-bloc-note', 'Papier spécial invitation');
    expect(grams.length).toBeGreaterThan(0);
    const values = grams
      .filter((g) => /^\d+g$/.test(g))
      .map((g) => parseInt(g, 10));
    expect(values.every((g) => g < 300)).toBe(true);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(BLOC_NOTE_INTERIOR_WEIGHTS['Papier spécial invitation']).not.toContain('300g');
  });

  it('nombre de pages — 50/75/100/Autres + champ numérique personnalisé', () => {
    const keys = fieldKeys('bn-bloc-note');
    expect(keys).toContain('nombre_feuilles_custom');

    const pagesSection = getProductConfig('bn-bloc-note')?.sections.find(
      (s) => s.title === 'Nombre de pages',
    );
    const pageFieldKeys = pagesSection?.fields.map((f) => f.key) ?? [];
    expect(pageFieldKeys).toEqual(['nombre_feuilles', 'nombre_feuilles_custom']);
    expect(pageFieldKeys).not.toContain('couleur_impression');
    expect(pageFieldKeys).not.toContain('technologie_interieur');

    const opts = fieldOptions('bn-bloc-note', 'nombre_feuilles');
    expect(opts).toEqual(['50 feuilles', '75 feuilles', '100 feuilles', 'Autres']);
  });

  it('impression intérieur — couleur et technologie hors nombre de pages', () => {
    const impression = getProductConfig('bn-bloc-note')?.sections.find(
      (s) => s.title === 'Impression intérieur',
    );
    const keys = impression?.fields.map((f) => f.key) ?? [];
    expect(keys).toContain('couleur_impression');
    expect(keys).toContain('technologie_interieur');
  });
});

describe('Bloc-note — calculs feuilles, prix et récap', () => {
  /**
   * Moteur actuel = publication (ISF intérieur + couverture + reliure).
   * Les forfaits historiques 5250 / 10500×0.8 / 19000 (ancien barème fixe)
   * sont volontairement remplacés — voir tests/bloc-note-pricing.test.ts.
   */
  beforeEach(() => {
    resetPublicationRuntimeParams();
    setPublicationRuntimeParams({
      utilisePalier: true,
      allowFallbackPrint: true,
      fallbackPuNoirA4: 200,
      fallbackPuQuadriA4: 400,
      blocColleAr: 500,
      pelliculageCouvertureA4: 600,
      coverRigidSupplementAr: 0,
      fallbackCoverPrintAr: 250,
    });
  });

  const baseConfig = {
    produit: 'Bloc-note',
    format: 'A5',
    matiere_couverture: 'PCB',
    type_support_couverture: '300g simple',
    finition_pelliculage: 'Sans pellicule',
    grammage_couverture: '300g',
    couleur_impression: 'N&B / Noir',
    technologie_interieur: 'Numérique Laser',
    nombre_feuilles: '100 feuilles',
    face_interieur: 'Recto',
    type_reliure: 'Bloc collé',
    famille_papier: 'Offset',
    grammage_interieur: '80g',
    qty: 1,
  };

  it('parse feuilles presets et personnalisé', () => {
    expect(parseBlocNoteSheetCount({ nombre_feuilles: '50 feuilles' })).toBe(50);
    expect(parseBlocNoteSheetCount({ nombre_feuilles: '75 feuilles' })).toBe(75);
    expect(parseBlocNoteSheetCount({
      nombre_feuilles: 'Autres',
      nombre_feuilles_custom: 120,
    })).toBe(120);
    expect(parseBlocNoteSheetCount({ nombre_feuilles: 'Autres' })).toBeNull();
  });

  it('50 feuilles — intérieur proportionnel au barème 100 feuilles (moteur publication)', () => {
    const full = computeBlocNotePrice({ ...baseConfig, nombre_feuilles: '100 feuilles' });
    const half = computeBlocNotePrice({ ...baseConfig, nombre_feuilles: '50 feuilles' });
    expect(full.calculable).toBe(true);
    expect(half.calculable).toBe(true);
    expect(half.publication?.feuillesPhysiques).toBe(50);
    expect(half.publication!.prixInterieur).toBe(
      Math.round(full.publication!.prixInterieur * 0.5),
    );
    // Couverture + reliure fixes → prix unitaire ≠ forfait historique 5250
    expect(half.prixUnitaire).toBe(
      half.publication!.prixInterieur
        + half.publication!.prixCouverture
        + half.publication!.prixReliure,
    );
    expect(half.prixUnitaire).toBeGreaterThan(half.publication!.prixInterieur);
  });

  it('feuilles personnalisées — prix, binding et récap', () => {
    const config = {
      ...baseConfig,
      nombre_feuilles: 'Autres',
      nombre_feuilles_custom: 80,
    };
    const full = computeBlocNotePrice({ ...baseConfig, nombre_feuilles: '100 feuilles' });
    const price = computeBlocNotePrice(config);
    expect(price.calculable).toBe(true);
    expect(price.publication?.feuillesPhysiques).toBe(80);
    expect(price.publication!.prixInterieur).toBe(
      Math.round(full.publication!.prixInterieur * 0.8),
    );
    // Ancien forfait 10500×0.8 abandonné au profit ISF + couv + reliure
    expect(price.prixUnitaire).toBe(
      price.publication!.prixInterieur
        + price.publication!.prixCouverture
        + price.publication!.prixReliure,
    );

    expect(parsePagesFromConfig(config)).toBe(80);

    const recap = calculateBlocNoteMaterialRecap('bn-bloc-note', config);
    expect(recap?.sheetCount).toBe(80);
    expect(recap?.interiorSurfaceM2).toBeGreaterThan(recap?.coverSurfaceM2 ?? 0);
    expect(recap?.prixCalculable).toBe(true);
  });

  it('PVC translucide — récap et stock', () => {
    const recap = calculateBlocNoteMaterialRecap('bn-bloc-note', {
      ...baseConfig,
      matiere_couverture: 'PVC translucide 1 mm',
      grammage_couverture: '1 mm',
    });
    expect(recap?.hasPvcTranslucide).toBe(true);
    expect(recap?.stockSummary).toMatch(/PVC translucide/i);
  });

  it('750g luxe 90 feuillets — moteur publication (pas forfait 19000)', () => {
    const r = computeBlocNotePrice({
      ...baseConfig,
      format: 'A4',
      type_support_couverture: '750g luxe',
      finition_pelliculage: 'Pelliculé',
      nombre_feuilles: '90 feuillets',
    });
    expect(r.calculable).toBe(true);
    expect(r.publication?.feuillesPhysiques).toBe(90);
    expect(r.publication!.prixInterieur).toBeGreaterThan(0);
    expect(r.publication!.prixCouverture).toBeGreaterThan(0);
    // Forfait historique 19000 remplacé par ISF A4 + couv 700g + pellicule + reliure
    expect(r.prixUnitaire).toBe(
      r.publication!.prixInterieur
        + r.publication!.prixCouverture
        + r.publication!.prixReliure,
    );
  });
});
