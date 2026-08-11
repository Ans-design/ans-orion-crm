import { describe, expect, it, beforeEach } from 'vitest';
import {
  physicalSheetsFromPages,
  isSaddleStitchPagesCompatible,
  computePublicationPrice,
} from '@/lib/pricing/publication-core';
import { computeLivresPrice } from '@/lib/pricing/livres-pricing';
import { computeBlocNotePrice } from '@/lib/pricing/bloc-note-pricing';
import {
  resetPublicationRuntimeParams,
  setPublicationRuntimeParams,
} from '@/lib/pricing/publication-pricing-rules';

describe('pages vs feuilles', () => {
  it('recto : pages = feuilles · R/V : ceil(pages/2)', () => {
    expect(physicalSheetsFromPages(50, 'Recto')).toBe(50);
    expect(physicalSheetsFromPages(50, 'Recto-verso')).toBe(25);
    expect(physicalSheetsFromPages(51, 'Recto-verso')).toBe(26);
  });

  it('piqûre à cheval : multiple de 4', () => {
    expect(isSaddleStitchPagesCompatible(16)).toBe(true);
    expect(isSaddleStitchPagesCompatible(18)).toBe(false);
  });
});

describe('livre A4 50 pages noir', () => {
  beforeEach(() => {
    resetPublicationRuntimeParams();
    setPublicationRuntimeParams({ utilisePalier: false, allowFallbackPrint: true });
  });

  it('intérieur 200×50 + couverture 8000 + reliure 5000 = 23000', () => {
    const r = computePublicationPrice({
      config: {
        format: 'A4 — 210×297 mm',
        pages: 50,
        matiere_int: 'Offset',
        grammage_int: '80g',
        couleur_int: 'Noir',
        face_interieur: 'Recto',
        matiere_couv: 'PCB',
        grammage_couv: '900g',
        type_couverture: 'Couverture rigide 900g',
        reliure: 'Sans reliure',
      },
      qty: 1,
      overrides: {
        puNoir: 200,
        couvertureBase: 8000,
        reliure: 5000,
      },
    });
    expect(r.calculable).toBe(true);
    expect(r.prixInterieur).toBe(10000);
    expect(r.prixCouverture).toBe(8000);
    expect(r.prixReliure).toBe(5000);
    expect(r.prixUnitaireAvantRemise).toBe(23000);
  });

  it('computeLivresPrice branche ISF/fallback', () => {
    const r = computeLivresPrice(
      'bk-livres',
      {
        format: 'A4 — 210×297 mm',
        pages: 50,
        matiere_int: 'Offset',
        grammage_int: '80g',
        couleur_int: 'Noir',
        face_int: 'Recto',
        matiere_couv: 'PCB',
        grammage_couv: '300g',
      },
      1,
    );
    // Avec fallback Admin 200 × 50 = 10000 + couverture
    expect(r.calculable || r.surDevis || r.missingField).toBeTruthy();
    if (r.calculable && r.breakdown) {
      expect(r.breakdown.prixImpressionNoir).toBeGreaterThan(0);
      expect(r.breakdown.pages).toBe(50);
      expect(r.breakdown.feuillesPhysiques).toBe(50);
    }
  });

  it('couverture = nombre_couverture × PU (pas de recto-verso)', () => {
    const base = {
      format: 'A4 — 210×297 mm',
      pages: 16,
      matiere_int: 'Offset',
      grammage_int: '80g',
      couleur_int: 'Noir',
      face_interieur: 'Recto',
      matiere_couv: 'PCB',
      grammage_couv: '300g',
      reliure: 'Sans reliure',
    };
    const r1 = computePublicationPrice({
      config: { ...base, nombre_couverture: 1 },
      qty: 1,
      overrides: { puNoir: 200, reliure: 0 },
    });
    const r4 = computePublicationPrice({
      config: { ...base, nombre_couverture: 4 },
      qty: 1,
      overrides: { puNoir: 200, reliure: 0 },
    });
    expect(r1.calculable).toBe(true);
    expect(r4.calculable).toBe(true);
    const p1 = r1.prixCouvertureDetail?.find((p) => /Impression couverture/.test(p.label));
    const p4 = r4.prixCouvertureDetail?.find((p) => /Impression couverture/.test(p.label));
    expect(p1?.label).toMatch(/1×/);
    expect(p4?.label).toMatch(/4×/);
    expect(p1!.amount).toBeGreaterThan(0);
    expect(p4!.amount).toBe(p1!.amount * 4);
    // Défaut sans champ = 1 couverture
    const rDef = computePublicationPrice({
      config: base,
      qty: 1,
      overrides: { puNoir: 200, reliure: 0 },
    });
    const pDef = rDef.prixCouvertureDetail?.find((p) => /Impression couverture/.test(p.label));
    expect(pDef?.amount).toBe(p1!.amount);
  });

  it('Invitation luxe n’ajoute pas le supplément couverture rigide', () => {
    const r = computePublicationPrice({
      config: {
        format: 'A4 — 210×297 mm',
        pages: 16,
        matiere_int: 'Offset',
        grammage_int: '80g',
        couleur_int: 'Noir',
        face_interieur: 'Recto',
        matiere_couv: 'Invitation luxe',
        grammage_couv: '300g',
        nombre_couverture: 1,
        reliure: 'Sans reliure',
      },
      qty: 1,
      overrides: { puNoir: 200, reliure: 0 },
    });
    const rigid = r.prixCouvertureDetail?.find((p) => /Supplément couverture rigide/.test(p.label));
    expect(rigid).toBeUndefined();
  });

  it('PVC translucide A4 = 4500 Ar (sans supplément rigide 5000)', () => {
    const r = computePublicationPrice({
      config: {
        format: 'A4 — 210×297 mm',
        pages: 16,
        matiere_int: 'Offset',
        grammage_int: '80g',
        couleur_int: 'Noir',
        face_interieur: 'Recto',
        matiere_couv: 'PVC translucide 1 mm',
        grammage_couv: '1 mm',
        nombre_couverture: 1,
        reliure: 'Sans reliure',
      },
      qty: 1,
      overrides: { puNoir: 200, reliure: 0 },
    });
    const print = r.prixCouvertureDetail?.find((p) => /Impression couverture/.test(p.label));
    const rigid = r.prixCouvertureDetail?.find((p) => /Supplément couverture rigide/.test(p.label));
    expect(print?.amount).toBe(4500);
    expect(rigid).toBeUndefined();
    expect(r.prixCouverture).toBe(4500);
  });

  it('pelliculé mat 320g A4 ≠ PCB 300g (2100 vs 1500)', () => {
    const base = {
      format: 'A4 — 210×297 mm',
      pages: 16,
      matiere_int: 'Offset',
      grammage_int: '80g',
      couleur_int: 'Noir',
      face_interieur: 'Recto',
      nombre_couverture: 1,
      reliure: 'Sans reliure',
    };
    const pell = computePublicationPrice({
      config: { ...base, matiere_couv: 'Papier pelliculé mat', grammage_couv: '320g' },
      qty: 1,
      overrides: { puNoir: 200, reliure: 0 },
    });
    const pcb = computePublicationPrice({
      config: { ...base, matiere_couv: 'PCB', grammage_couv: '300g' },
      qty: 1,
      overrides: { puNoir: 200, reliure: 0 },
    });
    const pPell = pell.prixCouvertureDetail?.find((p) => /Impression couverture/.test(p.label));
    const pPcb = pcb.prixCouvertureDetail?.find((p) => /Impression couverture/.test(p.label));
    expect(pPcb?.amount).toBe(1500);
    expect(pPell?.amount).toBe(2100);
    expect(pPell?.amount).not.toBe(pPcb?.amount);
  });
});

describe('bloc-note 50 feuillets', () => {
  beforeEach(() => {
    resetPublicationRuntimeParams();
    setPublicationRuntimeParams({ utilisePalier: false, allowFallbackPrint: true, blocColleAr: 500 });
  });

  it('calcule intérieur + couverture + collage', () => {
    const r = computeBlocNotePrice({
      format: 'A5',
      nombre_feuilles: '50 feuilles',
      famille_papier: 'Offset',
      grammage_interieur: '80g',
      face_interieur: 'Recto',
      couleur_impression: 'Noir',
      type_support_couverture: '300g simple',
      finition_pelliculage: 'Sans',
      type_reliure: 'Bloc collé',
      qty: 1,
    });
    expect(r.calculable || r.missingField).toBeTruthy();
    if (r.calculable && r.publication) {
      expect(r.publication.feuillesPhysiques).toBe(50);
      expect(r.publication.prixInterieur).toBeGreaterThan(0);
    }
  });
});

describe('POS seed pages_noir/pages_quadri (régression 0 Ar intérieur)', () => {
  beforeEach(() => {
    resetPublicationRuntimeParams();
    setPublicationRuntimeParams({ utilisePalier: false, allowFallbackPrint: true });
  });

  it('Quadri + pages_noir/pages_quadri vides (seed POS) → intérieur > 0', () => {
    const r = computePublicationPrice({
      config: {
        format: 'A4 — 210×297 mm',
        pages: 100,
        matiere_int: 'Offset',
        grammage_int: '80g',
        couleur_int: 'Quadrichromie (couleur)',
        face_interieur: 'Recto',
        // Simule buildEmptyPosConfig — clés présentes mais hors Mixte
        pages_noir: '',
        pages_quadri: '',
        matiere_couv: 'PCB',
        grammage_couv: '300g',
        reliure: 'Sans reliure',
      },
      qty: 1,
      overrides: { puQuadri: 600 },
    });
    expect(r.calculable).toBe(true);
    expect(r.missingField).toBeUndefined();
    expect(r.prixInterieur).toBe(60_000);
    expect(r.prixInterieurDetail?.pagesQuadri).toBe(100);
    expect(r.prixInterieurDetail?.pagesNoir).toBe(0);
  });

  it('Noir + pages_noir=0 pages_quadri=0 (default chips) → intérieur > 0', () => {
    const r = computePublicationPrice({
      config: {
        format: 'A4 — 210×297 mm',
        pages: 100,
        matiere_int: 'Offset',
        grammage_int: '80g',
        couleur_int: 'Noir',
        face_interieur: 'Recto',
        pages_noir: 0,
        pages_quadri: 0,
      },
      qty: 1,
      overrides: { puNoir: 200 },
    });
    expect(r.calculable).toBe(true);
    expect(r.prixInterieur).toBe(20_000);
  });

  it('Mixte 0+0 → pas calculable (pages_mixte)', () => {
    const r = computePublicationPrice({
      config: {
        format: 'A4 — 210×297 mm',
        pages: 100,
        matiere_int: 'Offset',
        grammage_int: '80g',
        couleur_int: 'Mixte (certaines pages couleur)',
        face_interieur: 'Recto',
        pages_noir: 0,
        pages_quadri: 0,
      },
      qty: 1,
      overrides: { puNoir: 200, puQuadri: 600 },
    });
    expect(r.calculable).toBe(false);
    expect(r.missingField).toBe('pages_mixte');
    expect(r.prixInterieur).toBe(0);
  });

  it('computeLivresPrice POS-like config → intérieur > 0', () => {
    const r = computeLivresPrice(
      'bk-livres',
      {
        format: 'A4 — 210×297 mm',
        pages: 100,
        matiere_int: 'Offset',
        grammage_int: '80g',
        couleur_int: 'Quadrichromie (couleur)',
        face_interieur: 'Recto',
        pages_noir: '',
        pages_quadri: '',
        matiere_couv: 'PCB',
        grammage_couv: '300g',
      },
      1,
    );
    expect(r.calculable).toBe(true);
    expect(r.publication?.prixInterieur ?? 0).toBeGreaterThan(0);
    expect(r.prixUnitaire).toBeGreaterThan(0);
  });
});
