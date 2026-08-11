import { describe, expect, it, vi } from 'vitest';
import { tryComputePrix2026GridPrice } from '@/lib/pricing/prix-2026-grid-price';
import { evaluateBache } from '@/lib/grand-format/bache-rules';
import { calculateGrandFormatPrice } from '@/lib/grand-format/calculate-grand-format-price';
import { entryGrandFormatPrix2026, lookupGrandFormatPrix2026 } from '@/lib/data/prix-2026-grids/grand-format';
import { resolvePrix2026UnitPrice, getPrix2026EntryUnitPrice } from '@/lib/data/prix-2026-grids';
import { calculatePrice } from '@/lib/pricing/calculate';
import {
  entryGrandFormatPrix2026 as archiveEntryGf,
  lookupGrandFormatPrix2026 as archiveLookupGf,
} from '../archives/pricing/prix-2026-grids/grand-format';

vi.mock('@/lib/prisma', () => {
  const emptyModel = () => ({
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
  });
  return {
    prisma: {
      tarif: emptyModel(),
      priceFormula: emptyModel(),
      salePrice2026: emptyModel(),
      articlePricingProfile: emptyModel(),
      productOptionGroup: emptyModel(),
      discountTier: emptyModel(),
      stockItem: emptyModel(),
      stockRule: emptyModel(),
      urgencyRule: emptyModel(),
      globalPricingConfig: emptyModel(),
      pricingCoeff: emptyModel(),
      finishingPrice: emptyModel(),
      impressionSfMaterial: emptyModel(),
      impressionSfPrice: emptyModel(),
    },
  };
});

describe('GF live price ≠ flat Excel entry', () => {
  it('tryComputePrix2026GridPrice ignore gf-* (runtime stub null)', async () => {
    const r = await tryComputePrix2026GridPrice('gf-bache', {
      largeur_cm: 120,
      hauteur_cm: 150,
      qty: 1,
    });
    expect(r).toBeNull();
    expect(entryGrandFormatPrix2026('gf-bache')).toBeNull();
    expect(archiveEntryGf('gf-bache')).toBe(20000);
  });

  it('resolvePrix2026UnitPrice runtime stub — archive conserve l’entrée historique', () => {
    expect(resolvePrix2026UnitPrice('gf-vinyl-blanc', { format: 'A0' }, 1)).toBeNull();
    expect(getPrix2026EntryUnitPrice('gf-vinyl-blanc')).toBeNull();
    expect(archiveEntryGf('gf-vinyl-blanc')).toBe(20000);
  });

  it('bâche 120×150 cm facture > 20 000 Ar (œillets + surface)', () => {
    const ev = evaluateBache(
      {
        type_bache: 'Bâche PVC standard',
        grammage: '440g',
        format: 'Format personnalisé',
        longueur_cm: 120,
        largeur_cm: 150,
        laize: '150 cm',
        dos: 'Dos blanc',
        qty: 1,
        oeillets_data: { mode: 'Tous les 50 cm' },
      },
      { prixM2: 20000 },
    );
    expect(ev.surfaceFacturableM2).toBeGreaterThan(1);
    expect(ev.finalTotal).toBeGreaterThan(20000);
  });

  it('vinyle perso 120×150 : surface × m² (pas 20 000 forfait)', () => {
    const gf = calculateGrandFormatPrice({
      config: {
        format: 'Format personnalisé',
        largeur_cm: 120,
        hauteur_cm: 150,
        laize: '150 cm',
        qty: 1,
      },
      availableLaizesCm: [100, 150],
      prixM2: 20000,
      stockKind: 'rouleau',
      quantite: 1,
      useA0FractionPricing: false,
    });
    expect(gf.calculable).toBe(true);
    expect(gf.prixUnitaireFinal).toBeGreaterThan(20000);
    expect(gf.prixUnitaireFinal).toBeGreaterThanOrEqual(Math.round(20000 * 1.8));
  });

  it('calculatePrice gf-vinyl perso > entrée catalogue', async () => {
    const r = await calculatePrice('gf-vinyl-blanc', {
      format: 'Format personnalisé',
      largeur_cm: 120,
      hauteur_cm: 150,
      laize: '150 cm',
      qty: 1,
    });
    expect(r).not.toBeNull();
    expect(r!.prixUnitaire).toBeGreaterThan(20000);
    expect(String(r!.snapshot?.priceSource ?? '')).toMatch(/gf|laize|surface|bache/i);
  });

  it('calculatePrice gf-oneway perso utilise prix/m² 30 000', async () => {
    const r = await calculatePrice('gf-oneway', {
      format: 'Format personnalisé',
      largeur_cm: 100,
      hauteur_cm: 100,
      laize: '137 cm',
      qty: 1,
    });
    expect(r).not.toBeNull();
    // 1 m² × 30 000 (éventuelle majoration laize selon règles)
    expect(r!.prixUnitaire).toBeGreaterThanOrEqual(30000);
    expect(r!.prixUnitaire).not.toBe(20000);
  });

  it('bâche incomplète → gfSurDevis (pas prixDepart 20 000)', async () => {
    const r = await calculatePrice('gf-bache', {
      qty: 1,
      // dims / type manquants → moteur ne chiffre pas
    });
    expect(r).not.toBeNull();
    expect(r!.prixUnitaire).toBe(0);
    expect(String(r!.snapshot?.priceSource ?? '')).toBe('gfSurDevis');
  });

  it('legacy gf-mesh route vers moteur bâche (pas forfait catalogue)', async () => {
    const r = await calculatePrice('gf-mesh', {
      format: 'Format personnalisé',
      longueur_cm: 120,
      largeur_cm: 150,
      laize: '1m60',
      qty: 1,
      oeillets_data: { mode: 'Tous les 50 cm' },
    });
    expect(r).not.toBeNull();
    expect(r!.prixUnitaire).not.toBe(20000);
    expect(String(r!.snapshot?.priceSource ?? '')).toMatch(/bache|gfSurDevis/i);
  });

  it('A0 / A1 vinyle : moteur gfStandardA0 (pas prixDepart Excel)', async () => {
    const a0 = await calculatePrice('gf-vinyl-blanc', { format: 'A0', qty: 1 });
    const a1 = await calculatePrice('gf-vinyl-blanc', { format: 'A1', qty: 1 });
    expect(a0).not.toBeNull();
    expect(a1).not.toBeNull();
    expect(String(a0!.snapshot?.priceSource ?? '')).toMatch(/gfStandardA0|gfSurDevis|gfSurface/i);
    expect(String(a0!.snapshot?.priceSource ?? '')).not.toBe('prixDepart');
    expect(String(a1!.snapshot?.priceSource ?? '')).not.toBe('prixDepart');
    // A1 = fraction d’A0 → unitaire A1 ≤ A0 quand les deux sont chiffrés
    if (a0!.prixUnitaire > 0 && a1!.prixUnitaire > 0) {
      expect(a1!.prixUnitaire).toBeLessThanOrEqual(a0!.prixUnitaire);
    }
  });

  it.each([
    ['gf-reflechissant', 46000],
    ['gf-frosted', 46000],
    ['gf-photo', 25000],
    ['gf-tissu', 30000],
  ] as const)('%s perso 100×100 ≥ prix/m² famille (pas forfait 20k générique)', async (id, prixM2Min) => {
    const r = await calculatePrice(id, {
      format: 'Format personnalisé',
      largeur_cm: 100,
      hauteur_cm: 100,
      laize: '150 cm',
      qty: 1,
    });
    expect(r).not.toBeNull();
    expect(String(r!.snapshot?.priceSource ?? '')).not.toBe('prixDepart');
    if (r!.prixUnitaire > 0) {
      expect(r!.prixUnitaire).toBeGreaterThanOrEqual(prixM2Min);
    }
  });

  it('lookupGrandFormatPrix2026 runtime stub ; archive entry-only', () => {
    const entry = lookupGrandFormatPrix2026('gf-bache', {}, 1);
    expect(entry).toBeNull();
    const archived = archiveLookupGf('gf-bache', {}, 1);
    expect(archived?.unitPrice).toBe(20000);
    expect(archived?.formula).toMatch(/entry_only/);
    expect(resolvePrix2026UnitPrice('gf-bache', { largeur_cm: 120, hauteur_cm: 150 }, 1)).toBeNull();
  });
});
