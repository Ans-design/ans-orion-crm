import { describe, expect, it } from 'vitest';
import {
  BACHE_CANONICAL_ID,
  bacheLegacyPrefill,
  bacheSearchMatches,
  resolveBacheCanonicalId,
} from '@/lib/pos/bache-catalog';
import {
  checkLaizeCompatibility,
  computeBacheSurface,
  evaluateBache,
} from '@/lib/grand-format/bache-rules';
import {
  computeEyelets,
  generateEyeletPositions,
  getEyeletGridDensity,
  resolveEyeletPreviewPoints,
} from '@/lib/grand-format/bache-eyelets';
import { laizeLabelToM, normalizeBacheLaizeLabel } from '@/lib/grand-format/bache-laize';
import { validateBacheConfig } from '@/lib/grand-format/bache-validation';
import { bacheCartSummaryLine } from '@/lib/grand-format/bache-display';
import { catalogLegacyRedirectTarget } from '@/lib/pos/catalog-resolver';
import { CATALOGUE } from '@/lib/data/catalogue';

const BASE_CONFIG = {
  type_bache: 'Bâche PVC standard',
  grammage: '440g',
  laize: '1m60',
  dos: 'Dos blanc',
  aspect: 'Mat',
  format: 'Format personnalisé',
  longueur_cm: 200,
  largeur_cm: 120,
  qty: 1,
  face: 'Recto seul',
};

describe('bache-catalog', () => {
  it('une seule carte Bâche dans le catalogue', () => {
    const bacheItems = CATALOGUE.filter(
      (a) => a.category === 'grand_format' && /bâche|bache|mesh/i.test(a.name),
    );
    expect(bacheItems).toHaveLength(1);
    expect(bacheItems[0]?.id).toBe(BACHE_CANONICAL_ID);
  });

  it('legacy IDs redirigent vers gf-bache', () => {
    expect(resolveBacheCanonicalId('gf-bache440')).toBe(BACHE_CANONICAL_ID);
    expect(catalogLegacyRedirectTarget('gf-mesh')).toBe(BACHE_CANONICAL_ID);
    expect(bacheLegacyPrefill('gf-bache320')).toMatchObject({ laize: '3m20' });
  });

  it('recherche mesh ouvre Bâche', () => {
    expect(bacheSearchMatches(BACHE_CANONICAL_ID, 'Bâche', 'mesh', 'mesh')).toBe(true);
    expect(bacheSearchMatches(BACHE_CANONICAL_ID, 'Bâche', '', 'bache 440')).toBe(true);
  });
});

describe('bache-rules', () => {
  it('calcule la surface', () => {
    expect(computeBacheSurface({ longueurM: 2, hauteurM: 1.2, quantite: 3 })).toEqual({
      surfaceUnitaireM2: 2.4,
      surfaceTotaleM2: 7.2,
    });
  });

  it('normalise laize 160 → 1m60 et 180 → 1m80', () => {
    expect(normalizeBacheLaizeLabel('180cm')).toBe('1m80');
    expect(normalizeBacheLaizeLabel('160cm')).toBe('1m60');
    expect(laizeLabelToM('1m60')).toBe(1.6);
    expect(laizeLabelToM('1m80')).toBe(1.8);
    expect(laizeLabelToM('3m20')).toBe(3.2);
    expect(laizeLabelToM('2m40')).toBe(2.4);
  });

  it('contrôle compatibilité laize', () => {
    const ok = checkLaizeCompatibility({ longueurM: 2, hauteurM: 1.2, laizeM: 1.6 });
    expect(ok.compatible).toBe(true);
    const rot = checkLaizeCompatibility({ longueurM: 1.2, hauteurM: 2, laizeM: 1.6 });
    expect(rot.orientation).toBe('rotation');
    const bad = checkLaizeCompatibility({ longueurM: 4, hauteurM: 2, laizeM: 1.6 });
    expect(bad.assemblageRequired).toBe(true);
  });

  it('calcule les œillets aux coins', () => {
    expect(computeEyelets({ mode: 'Aux coins', longueurM: 2, largeurM: 1.2 }).count).toBe(4);
  });

  it('répartit les œillets tous les 50 cm / 1 m avec les 4 coins obligatoires', () => {
    // 0.95 × 1.35 : côtés → 1 + 2 + 1 + 2 intermédiaires @50 cm + 4 coins = 10
    const every50 = computeEyelets({ mode: 'Tous les 50 cm', longueurM: 0.95, largeurM: 1.35 });
    expect(every50.count).toBe(10);
    expect(Array.isArray(every50.positions)).toBe(true);
    expect((every50.positions as string[]).length).toBe(10);

    // @1 m : 0 + 1 + 0 + 1 intermédiaires + 4 coins = 6
    const every1m = computeEyelets({ mode: 'Tous les 1 m', longueurM: 0.95, largeurM: 1.35 });
    expect(every1m.count).toBe(6);

    const preview50 = resolveEyeletPreviewPoints({
      mode: 'Tous les 50 cm',
      longueurM: 1.15,
      largeurM: 1.25,
    });
    const corners = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    for (const c of corners) {
      expect(preview50.some((p) => p.x === c.x && p.y === c.y)).toBe(true);
    }
  });

  it('génère une grille dynamique pour grandes bâches', () => {
    const density = getEyeletGridDensity({ longueurM: 2, largeurM: 1 });
    expect(density.horizontalPoints).toBeGreaterThanOrEqual(20);
    expect(density.verticalPoints).toBeGreaterThanOrEqual(20);
    const grid = generateEyeletPositions({ longueurM: 2, largeurM: 1 });
    const topPoints = grid.filter((p) => p.side === 'top');
    expect(topPoints.length).toBeGreaterThanOrEqual(20);
  });

  it('calcule le placement manuel dynamique avec coins obligatoires', () => {
    const positions = ['top-5', 'bottom-5'];
    const result = computeEyelets({
      mode: 'Placement manuel',
      longueurM: 10,
      largeurM: 1,
      manualPositions: positions,
    });
    // 4 coins + 2 points choisis
    expect(result.count).toBe(6);
    expect(result.total).toBe(3000);
    expect(Array.isArray(result.positions)).toBe(true);
    expect((result.positions as string[]).includes('top-0')).toBe(true);
    expect((result.positions as string[]).includes('bottom-0')).toBe(true);
  });

  it('évalue surfaces réelle / laize / facturable', () => {
    const ev = evaluateBache(
      {
        ...BASE_CONFIG,
        longueur_cm: 300,
        largeur_cm: 125,
        laize: 'Autres',
        laize_autre: 150,
      },
      { prixM2: 20000 },
    );
    expect(ev.surfaceReelleM2).toBe(3.75);
    expect(ev.surfaceFacturableM2).toBe(4.5);
    expect(ev.finalTotal).toBeGreaterThan(0);
  });

  it('120×150 cm ≠ 1 m² — prix = surface × 20 000 + œillets', () => {
    const ev = evaluateBache(
      {
        ...BASE_CONFIG,
        longueur_cm: 120,
        largeur_cm: 150,
        laize: '150 cm',
        oeillets_data: { mode: 'Tous les 50 cm' },
      },
      { prixM2: 20000 },
    );
    expect(ev.surfaceReelleM2).toBe(1.8);
    expect(ev.surfaceFacturableM2).toBeGreaterThanOrEqual(1.8);
    expect(ev.eyeletCount).toBeGreaterThan(0);
    expect(ev.eyeletTotalAr).toBe(ev.eyeletCount * 500);
    // Ne jamais facturer le forfait catalogue 20 000 comme si c’était 1 m²
    expect(ev.finalTotal).toBeGreaterThan(20000);
    expect(ev.finalTotal).toBe(
      Math.round(ev.surfaceFacturableM2 * 20000) + ev.eyeletTotalAr,
    );
  });

  it('ligne panier avec trois surfaces', () => {
    const line = bacheCartSummaryLine({
      ...BASE_CONFIG,
      longueur_cm: 300,
      largeur_cm: 125,
      laize: 'Autres',
      laize_autre: 150,
    });
    expect(line).toMatch(/^Bâche —/);
    expect(line).toMatch(/Surface réelle/);
    expect(line).not.toMatch(/Bâche 440g/i);
  });

  it('validation bloque config incomplète (champs), pas le tarif Admin', () => {
    expect(validateBacheConfig({})).toMatch(/type/i);
    // Config champs OK → valid même sans prixM2 (le POS gate via priceReady)
    expect(validateBacheConfig(BASE_CONFIG)).toBeNull();
    expect(
      validateBacheConfig({ ...BASE_CONFIG, prix_manuel: 150_000 }),
    ).toBeNull();
  });

  it('format ISO A0 : Laize non obligatoire pour validation panier', () => {
    expect(
      validateBacheConfig({
        type_bache: 'Bâche PVC standard',
        grammage: '440g',
        dos: 'Dos blanc',
        aspect: 'Brillant',
        format: 'A0 — 841×1189 mm',
        face: 'Recto seul',
        oeillets_data: { mode: 'Aucun', count: 0, positions: [] },
        qty: 2,
        // pas de laize
      }),
    ).toBeNull();
  });

  it('validation exige dimensions avant laize implicite', () => {
    expect(
      validateBacheConfig({
        ...BASE_CONFIG,
        format: 'Format personnalisé',
        longueur_cm: '',
        largeur_cm: '',
      }),
    ).toMatch(/longueur|dimensions/i);
  });

  it('format ISO A0 : pas de laize, surface réelle uniquement', () => {
    const ev = evaluateBache(
      {
        type_bache: 'Bâche PVC standard',
        grammage: '440g',
        dos: 'Dos blanc',
        aspect: 'Mat',
        format: 'A0',
        qty: 1,
        face: 'Recto seul',
        laize: '1m60', // ignoré
      },
      { prixM2: 20_000 },
    );
    expect(ev.laizeRuleLabel).toBeNull();
    expect(ev.surfaceLaizeM2).toBe(0);
    expect(ev.surfaceFacturableM2).toBeCloseTo(ev.surfaceReelleM2, 4);
    expect(ev.summaryLines.some((l) => /laize : non applicable/i.test(l))).toBe(true);
    expect(
      validateBacheConfig({
        type_bache: 'Bâche PVC standard',
        grammage: '440g',
        dos: 'Dos blanc',
        aspect: 'Mat',
        format: 'A0',
        qty: 1,
        face: 'Recto seul',
        prix_manuel: 20_000,
      }),
    ).toBeNull();
  });
});
