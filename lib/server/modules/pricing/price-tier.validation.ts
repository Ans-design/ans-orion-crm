import type { TierMode, TierValidationResult } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.types';
import { qtyChainStep, TIER_QTY_EPSILON } from '@/lib/pricing/validate-discount-tiers';

export type TierInput = {
  id?: string;
  minQty: number;
  maxQty: number | null;
  unitPrice: number | null;
  discountPercent: number;
  active?: boolean;
  mode?: TierMode;
  variantKey?: string;
  variantLabel?: string | null;
};

export function inferTierMode(tiers: Pick<TierInput, 'unitPrice' | 'discountPercent'>[]): TierMode {
  const withPrice = tiers.filter((t) => t.unitPrice != null && t.unitPrice > 0).length;
  const withPercent = tiers.filter((t) => t.discountPercent > 0).length;
  if (withPrice && !withPercent) return 'unit_price';
  if (withPercent && !withPrice) return 'percent';
  return 'unit_price';
}

export function validatePriceTiers(
  tiers: TierInput[],
  opts: {
    tierMode?: TierMode;
    qtyMin?: number | null;
    requireTiers?: boolean;
  } = {},
): TierValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  const mode = opts.tierMode ?? inferTierMode(tiers);

  if (!tiers.length) {
    if (opts.requireTiers) {
      warnings.push('Aucun palier configuré pour cet article');
    } else {
      info.push('Sans palier — le prix de base sera utilisé');
    }
    return { isValid: errors.length === 0, errors, warnings, info };
  }

  const active = tiers.filter((t) => t.active !== false);
  if (!active.length) {
    errors.push('Au moins un palier actif requis');
  }

  for (const t of active) {
    if (!Number.isFinite(t.minQty) || t.minQty < TIER_QTY_EPSILON) {
      errors.push(`Quantité min invalide (${t.minQty}) — autorisé dès ${TIER_QTY_EPSILON} (ex. m²)`);
    }
    if (t.maxQty != null && t.maxQty < t.minQty) {
      errors.push(`Palier ${t.minQty} : max < min`);
    }
    if (opts.qtyMin != null && opts.qtyMin > 0 && t === active[0] && t.minQty < opts.qtyMin) {
      warnings.push(`Premier palier (${t.minQty}) inférieur au minimum article (${opts.qtyMin})`);
    }
    if (mode === 'unit_price' && (t.unitPrice == null || t.unitPrice <= 0)) {
      errors.push(`Prix unitaire requis pour le palier ${t.minQty}`);
    }
    if (mode === 'percent' && (t.discountPercent < 0 || t.discountPercent > 100)) {
      errors.push(`Remise % invalide pour le palier ${t.minQty}`);
    }
    if (mode === 'coefficient' && (t.unitPrice == null || t.unitPrice <= 0)) {
      errors.push(`Coefficient invalide pour le palier ${t.minQty}`);
    }
  }

  const sorted = [...active].sort((a, b) => a.minQty - b.minQty);
  let unlimitedCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur.maxQty == null) unlimitedCount += 1;
    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      const curMax = cur.maxQty ?? Number.MAX_SAFE_INTEGER;
      if (curMax >= next.minQty) {
        errors.push(`Chevauchement entre paliers ${cur.minQty} et ${next.minQty}`);
      }
      if (cur.maxQty != null && cur.maxQty + qtyChainStep(cur.maxQty) < next.minQty - 1e-9) {
        warnings.push(`Trou détecté entre ${cur.maxQty} et ${next.minQty}`);
      }
    }
  }

  if (unlimitedCount === 0 && sorted.length > 0) {
    warnings.push('Aucun palier illimité — recommandé pour les grandes quantités');
  }
  if (unlimitedCount > 1) {
    warnings.push('Plusieurs paliers illimités détectés');
  }
  if (sorted.length && sorted[sorted.length - 1].maxQty != null) {
    info.push('Le dernier palier n\'est pas illimité');
  }

  if (errors.length === 0 && warnings.length === 0) {
    info.push('Paliers continus · Pas de chevauchement · Configuration valide');
  }

  return { isValid: errors.length === 0, errors, warnings, info };
}
