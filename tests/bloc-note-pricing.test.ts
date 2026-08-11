import { describe, expect, it, beforeEach } from 'vitest';
import {
  blocNoteVolumeRemiseRate,
  computeBlocNotePrice,
} from '@/lib/pricing/bloc-note-pricing';
import {
  resetPublicationRuntimeParams,
  setPublicationRuntimeParams,
} from '@/lib/pricing/publication-pricing-rules';
import { computePublicationPrice } from '@/lib/pricing/publication-core';

describe('bloc-note-pricing (ISF + couverture + reliure)', () => {
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
    format: 'A5',
    type_support_couverture: '300g simple',
    finition_pelliculage: 'Sans pellicule',
    couleur_impression: 'N&B / Noir',
    nombre_feuilles: '100 feuilles',
    face_interieur: 'Recto',
    type_reliure: 'Bloc collé',
    famille_papier: 'Offset',
    grammage_interieur: '80g',
    qty: 1,
  };

  it('calcule intérieur + couverture + collage (moteur publication)', () => {
    const r = computeBlocNotePrice(baseConfig);
    expect(r.calculable).toBe(true);
    expect(r.publication?.feuillesPhysiques).toBe(100);
    expect(r.publication?.prixInterieur).toBeGreaterThan(0);
    expect(r.publication?.prixReliure).toBe(500);
    expect(r.prixUnitaire).toBeGreaterThan(r.publication!.prixInterieur);
  });

  it('recto-verso double les faces facturées', () => {
    const recto = computeBlocNotePrice(baseConfig);
    const rv = computeBlocNotePrice({ ...baseConfig, face_interieur: 'Recto-verso' });
    expect(rv.calculable).toBe(true);
    expect(rv.publication!.prixInterieur).toBe(recto.publication!.prixInterieur * 2);
    expect(rv.publication?.feuillesPhysiques).toBe(100);
  });

  it('75 feuilles — intérieur proportionnel au recto 100f', () => {
    const full = computeBlocNotePrice(baseConfig);
    const partial = computeBlocNotePrice({ ...baseConfig, nombre_feuilles: '75 feuilles' });
    expect(partial.calculable).toBe(true);
    expect(partial.publication!.prixInterieur).toBe(Math.round(full.publication!.prixInterieur * 0.75));
  });

  it('pelliculage couverture ajouté', () => {
    const without = computeBlocNotePrice(baseConfig);
    const withPell = computeBlocNotePrice({
      ...baseConfig,
      finition_pelliculage: 'Pelliculé',
    });
    expect(withPell.calculable).toBe(true);
    expect(withPell.publication!.prixCouverture).toBeGreaterThanOrEqual(
      without.publication!.prixCouverture + 600,
    );
  });

  it('Autres format → sur devis', () => {
    const r = computeBlocNotePrice({ ...baseConfig, format: 'Autres' });
    expect(r.surDevis).toBe(true);
    expect(r.calculable).toBe(false);
  });

  it('volume remise paliers Admin publications', () => {
    expect(blocNoteVolumeRemiseRate(10)).toBe(0);
    expect(blocNoteVolumeRemiseRate(50)).toBe(0.03);
    expect(blocNoteVolumeRemiseRate(1000)).toBe(0.12);
  });

  it('override déterministe : 50f × 200 + couv 1000 + collage 500', () => {
    const r = computePublicationPrice({
      config: {
        format: 'A5',
        nombre_feuilles: 50,
        matiere_int: 'Offset',
        grammage_int: '80g',
        couleur_int: 'Noir',
        face_interieur: 'Recto',
        type_reliure: 'Bloc collé',
      },
      qty: 1,
      countAsPhysicalSheets: true,
      overrides: { puNoir: 200, couvertureBase: 1000, reliure: 500 },
    });
    expect(r.prixInterieur).toBe(10000);
    expect(r.prixCouverture).toBe(1000);
    expect(r.prixReliure).toBe(500);
    expect(r.prixUnitaireAvantRemise).toBe(11500);
  });
});
