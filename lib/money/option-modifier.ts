/**
 * Sémantique ProductOptionValue — ne jamais stocker Ar et multiplicateur dans le même champ.
 *
 * - fixed | piece | m2 → montant MGA (`priceAddonAr`)
 * - multiplier → ratio additif (`priceMultiplier`, ex. 0.1 = +10 %)
 *
 * `priceModifier` (Float legacy) : dual-read / dual-write jusqu’au retrait différé.
 */
import { roundMga } from '@/lib/money/mga';

export type OptionModifierType = 'fixed' | 'multiplier' | 'm2' | 'piece' | string;

export type OptionModifierRow = {
  modifierType?: string | null;
  priceModifier?: number | null;
  priceAddonAr?: number | null;
  priceMultiplier?: number | null;
};

export function isMoneyAddonType(modifierType: string | null | undefined): boolean {
  const t = (modifierType || 'fixed').toLowerCase();
  return t === 'fixed' || t === 'piece' || t === 'm2' || t === 'per_m2' || t === 'per-m2';
}

export function isMultiplierType(modifierType: string | null | undefined): boolean {
  return (modifierType || '').toLowerCase() === 'multiplier';
}

/** Supplément MGA (0 si type multiplicateur). Dual-read legacy si backfill pas encore appliqué. */
export function resolvePriceAddonAr(row: OptionModifierRow): number {
  if (isMultiplierType(row.modifierType)) return 0;
  const addon = row.priceAddonAr;
  const legacy = row.priceModifier;
  if (addon != null && Number(addon) !== 0) return roundMga(addon);
  if (legacy != null && Number(legacy) !== 0) return roundMga(legacy);
  if (addon != null) return roundMga(addon);
  return roundMga(legacy ?? 0);
}

/** Ratio multiplicateur (0 si type montant). Dual-read legacy si besoin. */
export function resolvePriceMultiplier(row: OptionModifierRow): number {
  if (!isMultiplierType(row.modifierType)) return 0;
  const m = row.priceMultiplier;
  const legacy = row.priceModifier;
  if (m != null && Number(m) !== 0) return Number(m);
  if (legacy != null && Number(legacy) !== 0) return Number(legacy);
  return Number(m ?? legacy ?? 0) || 0;
}

/** Payload Prisma dual-write à partir d’une saisie UI encore nommée priceModifier. */
export function dualWriteOptionModifier(
  modifierType: string | null | undefined,
  rawValue: number,
): {
  priceModifier: number;
  priceAddonAr: number;
  priceMultiplier: number;
} {
  if (isMultiplierType(modifierType)) {
    const mult = Number(rawValue);
    const safe = Number.isFinite(mult) ? mult : 0;
    return { priceModifier: safe, priceAddonAr: 0, priceMultiplier: safe };
  }
  const ar = roundMga(rawValue);
  return { priceModifier: ar, priceAddonAr: ar, priceMultiplier: 0 };
}

/**
 * Détecte ambiguïté historique (ne pas auto-corriger).
 * - multiplier avec |v| > 5 souvent une erreur (Ar stocké comme mult)
 * - fixed/piece/m2 avec 0 < |v| < 1 souvent un ratio mal typé
 */
export function detectAmbiguousModifier(row: OptionModifierRow & { id?: string }): string | null {
  const type = (row.modifierType || 'fixed').toLowerCase();
  const legacy = Number(row.priceModifier);
  if (!Number.isFinite(legacy)) return 'non_finite';
  if (type === 'multiplier' && Math.abs(legacy) > 5) {
    return 'multiplier_looks_like_amount_ar';
  }
  if (isMoneyAddonType(type) && legacy !== 0 && Math.abs(legacy) < 1 && !Number.isInteger(legacy)) {
    return 'amount_looks_like_ratio';
  }
  if (isMoneyAddonType(type) && !Number.isInteger(legacy)) {
    return 'fractional_amount_ar';
  }
  return null;
}
