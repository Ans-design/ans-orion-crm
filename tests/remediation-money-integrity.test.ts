/**
 * Tests intégrité monétaire — calculateur central + sémantique options.
 */
import { describe, expect, it } from 'vitest';
import {
  MGA_INT32_MAX,
  MgaIntegrityError,
  addMga,
  applyRemiseFixedMga,
  applyRemiseMga,
  assertMgaInt,
  eqMga,
  formatMga,
  margeMga,
  parseMgaInput,
  parseMgaStrict,
  remboursementMga,
  serializeMgaForJson,
  soldeMga,
  splitTvaMga,
  subMga,
  tropPercuMga,
} from '@/lib/money/mga';
import {
  detectAmbiguousModifier,
  dualWriteOptionModifier,
  resolvePriceAddonAr,
  resolvePriceMultiplier,
} from '@/lib/money/option-modifier';
import { computePaidTotal } from '@/lib/finance/payment-totals';

describe('calculateur MGA central', () => {
  it('zéro', () => {
    expect(addMga(0, 0)).toBe(0);
    expect(soldeMga(0, 0)).toBe(0);
    expect(formatMga(0)).toContain('0');
  });

  it('négatif interdit en parseStrict par défaut', () => {
    expect(() => parseMgaStrict(-1)).toThrow(MgaIntegrityError);
    expect(margeMga(100, 150)).toBe(-50);
  });

  it('grands montants sous Int32', () => {
    expect(addMga(1_000_000_000, 500_000_000)).toBe(1_500_000_000);
    expect(() => parseMgaStrict(MGA_INT32_MAX)).not.toThrow();
    expect(() => parseMgaStrict(MGA_INT32_MAX + 1)).toThrow(/Hors plage/);
  });

  it('remise fixe et pourcentage', () => {
    expect(applyRemiseMga(1_000_000, 10)).toBe(900_000);
    expect(applyRemiseFixedMga(1_000_000, 150_000)).toBe(850_000);
    expect(applyRemiseFixedMga(100, 500)).toBe(0);
  });

  it('TVA', () => {
    const t = splitTvaMga(100_000, 20, 'from-ht');
    expect(t).toEqual({ ht: 100_000, tva: 20_000, ttc: 120_000 });
  });

  it('plusieurs paiements + remboursement + trop-perçu', () => {
    const paid = computePaidTotal([
      { montant: 100_000, type: 'Acompte' },
      { montant: 50_000, type: 'Solde' },
      { montant: 20_000, type: 'Remboursement' },
    ]);
    expect(paid).toBe(130_000);
    expect(soldeMga(200_000, paid)).toBe(70_000);
    expect(tropPercuMga(100_000, 130_000)).toBe(30_000);
    expect(remboursementMga(130_000, 200_000)).toBe(130_000);
  });

  it('annulation / solde après remboursement total', () => {
    const after = computePaidTotal([
      { montant: 80_000, type: 'Acompte' },
      { montant: 80_000, type: 'Remboursement' },
    ]);
    expect(after).toBe(0);
    expect(soldeMga(80_000, after)).toBe(80_000);
  });

  it('refuse fractionnaire historique en strict', () => {
    expect(() => parseMgaStrict(100.5)).toThrow(/fractionnaire/);
  });

  it('comparaison exacte (pas epsilon)', () => {
    expect(eqMga(100, 100)).toBe(true);
    expect(eqMga(100.4, 100)).toBe(true);
    expect(eqMga(100, 101)).toBe(false);
  });

  it('sérialisation API', () => {
    expect(serializeMgaForJson(12_500)).toBe(12_500);
    expect(serializeMgaForJson(BigInt(99))).toBe(99);
    assertMgaInt(1);
  });

  it('parse input utilisateur', () => {
    expect(parseMgaInput('1 250 000 Ar')).toBe(1_250_000);
  });
});

describe('priceModifier sémantique', () => {
  it('dual-write fixed → addon Ar', () => {
    expect(dualWriteOptionModifier('fixed', 5000)).toEqual({
      priceModifier: 5000,
      priceAddonAr: 5000,
      priceMultiplier: 0,
    });
  });

  it('dual-write multiplier → ratio', () => {
    expect(dualWriteOptionModifier('multiplier', 0.15)).toEqual({
      priceModifier: 0.15,
      priceAddonAr: 0,
      priceMultiplier: 0.15,
    });
  });

  it('resolve préfère colonnes sémantiques non nulles non-zéro', () => {
    expect(
      resolvePriceAddonAr({
        modifierType: 'piece',
        priceModifier: 999,
        priceAddonAr: 100,
      }),
    ).toBe(100);
    expect(
      resolvePriceMultiplier({
        modifierType: 'multiplier',
        priceModifier: 0.2,
        priceMultiplier: 0.25,
      }),
    ).toBe(0.25);
  });

  it('legacy fallback si addon encore à 0 (pré-backfill)', () => {
    expect(
      resolvePriceAddonAr({
        modifierType: 'fixed',
        priceModifier: 3000,
        priceAddonAr: 0,
      }),
    ).toBe(3000);
  });

  it('détecte ambiguïtés sans auto-corriger', () => {
    expect(detectAmbiguousModifier({ modifierType: 'multiplier', priceModifier: 5000 })).toBe(
      'multiplier_looks_like_amount_ar',
    );
    expect(detectAmbiguousModifier({ modifierType: 'fixed', priceModifier: 0.25 })).toBe(
      'amount_looks_like_ratio',
    );
    expect(detectAmbiguousModifier({ modifierType: 'fixed', priceModifier: 100 })).toBeNull();
  });
});

describe('calcul concurrent déterministe', () => {
  it('ordre opérandes n’altère pas addMga', () => {
    expect(addMga(10.4, 20.4, 30.4)).toBe(addMga(30.4, 10.4, 20.4));
    expect(subMga(addMga(100, 50), 25)).toBe(125);
  });
});
