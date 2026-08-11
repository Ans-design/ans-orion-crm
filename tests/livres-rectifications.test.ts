import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  BOOK_INTERIOR_MATIERES,
  BOOK_INTERIOR_WEIGHTS,
} from '@/lib/data/book-material-catalog';
import { BLOC_NOTE_INTERIOR_WEIGHTS } from '@/lib/data/carte-cover-material-catalog';
import {
  computePhysicalSheets,
  parsePagesFromConfig,
} from '@/lib/data/binding-catalog';
import { BINDING_LABELS } from '@/lib/data/binding-catalog';
import { LIVRES_TYPES } from '@/lib/pos/livres-catalog';
import {
  filterLivresReliureOptions,
  livresFormatAllowsSaddleStitch,
  nextMultipleOf4,
  validateLivresConfig,
  validateLivresMixtePages,
} from '@/lib/pos/livres-binding-policy';
import { computeLivresPrice } from '@/lib/pricing/livres-pricing';
import { calculateLivresMaterialRecap } from '@/lib/pricing/livres-material-recap';
import { buildEmptyPosConfig } from '@/lib/pos/initial-config';

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

function grammagesForMatiere(articleId: string, matiere: string): string[] {
  const cfg = getProductConfig(articleId);
  const gram = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'grammage_int');
  return gram?.optionsFilter?.optionsByValue?.[matiere] ?? [];
}

const BASE_CONFIG = {
  type: 'Booklet',
  format: 'A5 — 148×210 mm',
  pages: 48,
  couleur_int: 'Quadrichromie (couleur)',
  face_interieur: 'Recto-verso',
  matiere_int: 'PCM',
  grammage_int: '80g',
  matiere_couv: 'PCB',
  grammage_couv: '300g',
  reliure: BINDING_LABELS.SPIRALE_PLASTIQUE,
  qty: 50,
};

describe('Livres & publications — rectifications', () => {
  it('formats A4+ et A3 disponibles', () => {
    const formats = fieldOptions('bk-livres', 'format');
    expect(formats).toContain('A4+ — 216×303 mm');
    expect(formats).toContain('A3 — 297×420 mm');
  });

  it('A3 masque la piqûre à cheval — A4 la conserve', () => {
    expect(livresFormatAllowsSaddleStitch('A4 — 210×297 mm')).toBe(true);
    expect(livresFormatAllowsSaddleStitch('A3 — 297×420 mm')).toBe(false);
    expect(livresFormatAllowsSaddleStitch('A4+ — 216×303 mm')).toBe(false);

    const opts = [
      BINDING_LABELS.PIQURE,
      BINDING_LABELS.SPIRALE_PLASTIQUE,
      BINDING_LABELS.DCC,
    ];
    const filtered = filterLivresReliureOptions(opts, { format: 'A3 — 297×420 mm' });
    expect(filtered).not.toContain(BINDING_LABELS.PIQURE);
    expect(filterLivresReliureOptions(opts, { format: 'A4 — 210×297 mm' })).toContain(
      BINDING_LABELS.PIQURE,
    );
  });

  it('nombre de pages — champ numérique unique sans chips prédéfinis', () => {
    const pagesField = getProductConfig('bk-livres')?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'pages');
    expect(pagesField?.type).toBe('number');
    expect(pagesField?.options).toBeUndefined();
    expect(parsePagesFromConfig({ pages: 40 })).toBe(40);
    expect(computePhysicalSheets(40, 'recto_verso')).toBe(20);
    expect(computePhysicalSheets(41, 'recto_verso')).toBe(21);
  });

  it('piqûre à cheval bloque les nombres non divisibles par 4', () => {
    expect(nextMultipleOf4(18)).toBe(20);
    expect(nextMultipleOf4(22)).toBe(24);
    const err = validateLivresConfig({
      ...BASE_CONFIG,
      pages: 18,
      reliure: BINDING_LABELS.PIQURE,
    });
    expect(err).toMatch(/multiple de 4/i);
    expect(err).toMatch(/20/);
  });

  it('Menu plié et dérivés supprimés du catalogue actif', () => {
    expect(LIVRES_TYPES).not.toContain('Menu plié');
    const typeOpts = fieldOptions('bk-livres', 'type');
    expect(typeOpts).not.toContain('Menu plié');

    const volets = fieldOptions('bk-livres', 'volets');
    expect(volets).not.toContain('2 volets (pli simple)');
    expect(volets).not.toContain('3 volets (accordéon)');
  });

  it('intérieur aligné bloc-note — PCM et invitation < 300g', () => {
    expect(BOOK_INTERIOR_MATIERES).toContain('PCM');
    expect(BOOK_INTERIOR_MATIERES).toContain('Papier spécial invitation');
    expect(BOOK_INTERIOR_WEIGHTS['Papier spécial invitation']).toEqual(
      BLOC_NOTE_INTERIOR_WEIGHTS['Papier spécial invitation'],
    );

    const grams = grammagesForMatiere('bk-livres', 'Papier spécial invitation');
    const values = grams.filter((g) => /^\d+g$/.test(g)).map((g) => parseInt(g, 10));
    expect(values.every((g) => g < 300)).toBe(true);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('couleur impression intérieur placée entre pages et intérieur', () => {
    const titles = sectionTitles('bk-livres');
    const pagesIdx = titles.indexOf('Nombre de pages');
    const couleurIdx = titles.indexOf('Couleur impression intérieur');
    const interieurIdx = titles.indexOf('Intérieur — Matière & grammage');
    const couvertureIdx = titles.indexOf('Couverture — Matière & grammage');

    expect(pagesIdx).toBeGreaterThanOrEqual(0);
    expect(couleurIdx).toBeGreaterThan(pagesIdx);
    expect(interieurIdx).toBeGreaterThan(couleurIdx);
    expect(couvertureIdx).toBeGreaterThan(interieurIdx);
    expect(titles.indexOf('Couleur impression intérieur')).toBeLessThan(couvertureIdx);
  });

  it('mixte — pages noir + quadri = total et prix calculé', () => {
    const mixte = {
      ...BASE_CONFIG,
      couleur_int: 'Mixte (certaines pages couleur)',
      pages: 100,
      pages_noir: 70,
      pages_quadri: 30,
    };
    expect(validateLivresMixtePages(mixte)).toBeNull();

    const invalid = { ...mixte, pages_quadri: 40 };
    expect(validateLivresMixtePages(invalid)).toMatch(/égal au nombre total/i);

    const pricing = computeLivresPrice('bk-livres', mixte, 50);
    expect(pricing.calculable).toBe(true);
    expect(pricing.breakdown?.prixImpressionNoir).toBeGreaterThan(0);
    expect(pricing.breakdown?.prixImpressionQuadri).toBeGreaterThan(0);
  });

  it('récap matière brute complet', () => {
    const recap = calculateLivresMaterialRecap('bk-livres', BASE_CONFIG);
    expect(recap?.pageCount).toBe(48);
    expect(recap?.sheetCount).toBe(24);
    expect(recap?.printModeLabel).toBe('Recto-verso');
    expect(recap?.interiorSurfaceM2).toBeGreaterThan(0);
    expect(recap?.coverSurfaceM2).toBeGreaterThan(0);
    expect(recap?.bindingLabel).toBeTruthy();
    expect(recap?.prixCalculable).toBe(true);
  });

  it('champs mixte présents dans la config', () => {
    const keys = fieldKeys('bk-livres');
    expect(keys).toContain('pages_noir');
    expect(keys).toContain('pages_quadri');
    expect(keys).toContain('face_interieur');
    expect(keys).toContain('nombre_couverture');
  });

  it('nombre_couverture seedé à 1 (default optionnel)', () => {
    const empty = buildEmptyPosConfig(getProductConfig('bk-livres'));
    expect(empty.nombre_couverture).toBe(1);
  });
});
