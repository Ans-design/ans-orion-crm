import { describe, expect, it } from 'vitest';
import {
  parseBacheFinishings,
  priceBacheFinishings,
  computeBacheFinishingMeters,
} from '@/lib/grand-format/bache-finishings';
import { evaluateBache } from '@/lib/grand-format/bache-rules';
import { DEFAULT_GF_ADMIN_PRICING } from '@/lib/grand-format/gf-admin-config';

describe('bache finishings linéaires', () => {
  it('ourlet = périmètre × qty × tarif', () => {
    // 1,2 × 1,5 m → périmètre 5,4 m
    const priced = priceBacheFinishings(
      { ourlet: true },
      1.2,
      1.5,
      1,
    );
    expect(priced.lines).toHaveLength(1);
    expect(priced.lines[0]!.meters).toBeCloseTo(5.4, 5);
    expect(priced.totalAr).toBe(Math.round(5.4 * DEFAULT_GF_ADMIN_PRICING.ourletPerMlAr));
  });

  it('fourreau haut = longueur × tarif', () => {
    const meters = computeBacheFinishingMeters({ fourreau: true, fourreauSides: 'top' }, 2, 1, 1);
    expect(meters.fourreau).toBe(2);
    const both = computeBacheFinishingMeters({ fourreau: true, fourreauSides: 'both' }, 2, 1, 1);
    expect(both.fourreau).toBe(4);
  });

  it('evaluateBache ajoute ourlet au total', () => {
    const base = evaluateBache(
      {
        type_bache: 'Bâche PVC standard',
        grammage: '440g',
        format: 'Format personnalisé',
        longueur_cm: 120,
        largeur_cm: 150,
        laize: '150 cm',
        dos: 'Dos blanc',
        qty: 1,
      },
      { prixM2: 20000 },
    );
    const withOurlet = evaluateBache(
      {
        type_bache: 'Bâche PVC standard',
        grammage: '440g',
        format: 'Format personnalisé',
        longueur_cm: 120,
        largeur_cm: 150,
        laize: '150 cm',
        dos: 'Dos blanc',
        qty: 1,
        bache_finitions: { ourlet: true },
      },
      { prixM2: 20000 },
    );
    expect(base.finalTotal).not.toBeNull();
    expect(withOurlet.finalTotal).not.toBeNull();
    expect(withOurlet.finishingTotalAr).toBeGreaterThan(0);
    expect(withOurlet.finalTotal!).toBe((base.finalTotal ?? 0) + withOurlet.finishingTotalAr);
  });

  it('parse flags plats et objet', () => {
    expect(parseBacheFinishings({ finition_ourlet: 'oui' }).ourlet).toBe(true);
    expect(parseBacheFinishings({ bache_finitions: 'ourlet,fourreau' }).fourreau).toBe(true);
  });
});
