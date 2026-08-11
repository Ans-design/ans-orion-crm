/**
 * Tests acceptation prix textile — Bob + Lambahoany.
 */
import { describe, expect, it } from 'vitest';
import {
  applyTextileDiscount,
  computeBobExample,
  computeLambahoanyExample,
  computeTextileUnitPrice,
  resolveTextileSurfaceM2,
  type TextileDbBundle,
} from '@/lib/pricing/textile-pricing';

function baseBundle(overrides?: Partial<TextileDbBundle>): TextileDbBundle {
  return {
    rule: {
      articleId: 'tx-bob',
      typeCalcul: 'STANDARD',
      utiliseSupportVierge: true,
      utiliseMarquage: true,
      utiliseMainOeuvre: true,
      utiliseSurfaceM2: false,
      exceptionLambahoany: false,
      status: 'published',
      active: true,
    },
    supports: [
      {
        articleId: 'tx-bob',
        matiere: 'Coton',
        taille: 'S',
        couleur: null,
        typeModele: 'Bob',
        prixSupportVierge: 5000,
        unit: 'pièce',
        active: true,
        status: 'published',
        visiblePOS: true,
      },
    ],
    markings: [
      {
        technique: 'Flex textile',
        tailleMarquage: 'A6 — 105×148 mm',
        zoneMarquage: null,
        formatSurface: null,
        prixMarquage: 2000,
        active: true,
        status: 'published',
      },
    ],
    labors: [
      {
        typeLabor: 'Press textile',
        techniqueLiee: 'Flex textile',
        articleId: '*',
        prixLabor: 1000,
        active: true,
        status: 'published',
      },
    ],
    tiers: [
      {
        articleId: 'tx-bob',
        qtyMin: 10,
        qtyMax: 49,
        typeRemise: 'percent',
        valeurRemise: 10,
        active: true,
      },
    ],
    ...overrides,
  };
}

describe('textile-pricing', () => {
  it('Bob — support + marquage + MO = 8000', () => {
    expect(computeBobExample()).toBe(8000);
    const r = computeTextileUnitPrice(
      'tx-bob',
      {
        matiere: 'Coton',
        taille_bob: 'S (54-55 cm)',
        technique: 'Flex textile',
        format_marquage: 'A6 — 105×148 mm',
        qty: 1,
      },
      baseBundle(),
    );
    expect(r.calculable).toBe(true);
    expect(r.missing).toBeNull();
    expect(r.unitPrice).toBe(8000);
    expect(r.supportPrice).toBe(5000);
    expect(r.markingPrice).toBe(2000);
    expect(r.laborPrice).toBe(1000);
  });

  it('Bob — remise 10 % à qty 10', () => {
    const unit = 8000;
    const d = applyTextileDiscount(unit, 10, baseBundle().tiers, 'tx-bob');
    expect(d.sousTotal).toBe(72000);
    expect(d.remiseAmount).toBe(8000);
    expect(Math.abs(d.remiseRate - 0.1)).toBeLessThan(1e-9);
  });

  it('Lambahoany — surface m² × prix support + MO', () => {
    expect(computeLambahoanyExample(100, 150, 20000, 0)).toBe(30000);
    const surf = resolveTextileSurfaceM2({ format: 'Petit — 100×140 cm' });
    expect(surf).toBeTruthy();
    expect(surf!.widthCm).toBe(100);
    expect(surf!.heightCm).toBe(140);

    const r = computeTextileUnitPrice(
      'tx-lambahoany',
      {
        format: 'Custom',
        largeur: 100,
        hauteur: 150,
        matiere: 'Coton standard',
        technique: 'Impression textile',
        qty: 1,
      },
      {
        rule: {
          articleId: 'tx-lambahoany',
          typeCalcul: 'SURFACE_M2',
          utiliseSupportVierge: false,
          utiliseMarquage: false,
          utiliseMainOeuvre: true,
          utiliseSurfaceM2: true,
          exceptionLambahoany: true,
          status: 'published',
          active: true,
        },
        supports: [
          {
            articleId: 'tx-lambahoany',
            matiere: 'Coton standard',
            taille: null,
            couleur: null,
            typeModele: 'Lambahoany',
            prixSupportVierge: 20000,
            unit: 'm²',
            active: true,
            status: 'published',
            visiblePOS: true,
          },
        ],
        markings: [],
        labors: [
          {
            typeLabor: 'Main d’œuvre impression textile',
            techniqueLiee: 'Impression textile',
            articleId: 'tx-lambahoany',
            prixLabor: 2000,
            active: true,
            status: 'published',
          },
        ],
        tiers: [],
      },
    );
    expect(r.calculable).toBe(true);
    expect(r.surfaceM2).toBe(1.5);
    expect(r.supportPrice).toBe(30000);
    expect(r.laborPrice).toBe(2000);
    expect(r.unitPrice).toBe(32000);
  });

  it('Bob — support manquant → non calculable', () => {
    const r = computeTextileUnitPrice(
      'tx-bob',
      {
        matiere: 'Soie',
        taille_bob: 'XXL',
        technique: 'Flex textile',
        format_marquage: 'A6 — 105×148 mm',
      },
      baseBundle(),
    );
    expect(r.calculable).toBe(false);
    expect(r.missing).toBe('Support vierge manquant');
  });
});
