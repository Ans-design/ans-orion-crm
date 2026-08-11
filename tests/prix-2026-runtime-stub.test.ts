/**
 * Preuve que le runtime n’expose plus les grilles Excel (stubs).
 * Les chiffres historiques restent dans archives/ — tests d’archive séparés si besoin.
 */
import { describe, expect, it } from 'vitest';
import {
  articleHasPrix2026Grid,
  getPrix2026AdminPriceDisplay,
  getPrix2026EntryUnitPrice,
  resolvePrix2026UnitPrice,
} from '@/lib/data/prix-2026-grids';
import { entryGrandFormatPrix2026 } from '@/lib/data/prix-2026-grids/grand-format';
import { isCarteriePrix2026Article } from '@/lib/data/prix-2026-grids/carte-visite';

describe('prix-2026 runtime stub', () => {
  it('toutes les lookups retournent null / false', () => {
    expect(articleHasPrix2026Grid('cv-std')).toBe(false);
    expect(getPrix2026EntryUnitPrice('cv-std')).toBeNull();
    expect(getPrix2026EntryUnitPrice('gd-mug')).toBeNull();
    expect(getPrix2026EntryUnitPrice('plv-rollup')).toBeNull();
    expect(getPrix2026AdminPriceDisplay('tx-tshirt')).toBeNull();
    expect(resolvePrix2026UnitPrice('fly-std', { qty: 500 }, 500)).toBeNull();
    expect(entryGrandFormatPrix2026('gf-vinyl-blanc')).toBeNull();
    expect(isCarteriePrix2026Article('cv-std')).toBe(false);
  });
});
