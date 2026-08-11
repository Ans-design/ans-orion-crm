export type TierInput = {
  id?: string;
  minQty: number;
  maxQty: number | null;
  unitPrice: number | null;
  discountPercent: number;
  active?: boolean;
  variantKey?: string;
  variantLabel?: string | null;
};

/** Quantité mini autorisée (pièces ou m² / fraction de m²). */
export const TIER_QTY_EPSILON = 0.01;

export function validateDiscountTiers(tiers: TierInput[]): string | null {
  if (!tiers.length) return null;

  const active = tiers.filter((t) => t.active !== false);
  if (!active.length) return 'Au moins un palier actif requis';

  for (const t of active) {
    if (!Number.isFinite(t.minQty) || t.minQty < TIER_QTY_EPSILON) {
      return `Quantité min invalide (${t.minQty}) — minimum ${TIER_QTY_EPSILON}`;
    }
    if (t.maxQty != null && t.maxQty < t.minQty) {
      return `Palier ${t.minQty} : max < min`;
    }
    if (t.unitPrice != null && t.unitPrice < 0) {
      return `Prix unitaire négatif (palier ${t.minQty})`;
    }
    if (t.discountPercent < 0 || t.discountPercent > 100) {
      return `Remise % invalide (palier ${t.minQty})`;
    }
  }

  const sorted = [...active].sort((a, b) => a.minQty - b.minQty);

  // Doublons de minQty
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i]!.minQty === sorted[i + 1]!.minQty) {
      return `Paliers dupliqués à la quantité ${sorted[i]!.minQty}`;
    }
  }

  // Ordre non monotone déjà couvert par le tri ; chevauchements + trous
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i]!;
    const next = sorted[i + 1]!;
    const curMax = cur.maxQty ?? Number.MAX_SAFE_INTEGER;
    if (curMax >= next.minQty) {
      return `Chevauchement entre paliers ${cur.minQty} et ${next.minQty}`;
    }
    // Trou : max borné et next.min > max + pas
    const step = qtyChainStep(cur.maxQty!);
    if (cur.maxQty != null && next.minQty > cur.maxQty + step + 1e-9) {
      return `Trou de quantité entre ${cur.maxQty} et ${next.minQty}`;
    }
  }

  return null;
}

/** Pas d’enchaînement : +1 pour quantités entières ≥ 1, sinon +0,01 (m²). */
export function qtyChainStep(maxQty: number): number {
  if (Number.isInteger(maxQty) && maxQty >= 1) return 1;
  return TIER_QTY_EPSILON;
}

export function nextTierMinAfter(maxQty: number): number {
  const step = qtyChainStep(maxQty);
  const next = maxQty + step;
  // Évite 0.30000000004
  return Math.round(next * 1000) / 1000;
}

/**
 * Enchaîne les paliers : min ligne N+1 = max ligne N + pas (1 ou 0,01).
 * La 1ʳᵉ ligne garde son min ; les suivantes sont dérivées (pas de saisie manuelle).
 *
 * `protectMaxIndex` : ne pas vider le max de cette ligne (saisie en cours — évite
 * d’effacer « 5 » pendant qu’on tape « 500 » alors que min = 101).
 */
export function chainDiscountTierMins<T extends { minQty: number; maxQty: number | null }>(
  rows: T[],
  opts?: { protectMaxIndex?: number },
): T[] {
  if (rows.length <= 1) return rows.map((r) => ({ ...r }));
  const next = rows.map((r) => ({ ...r }));
  const protect = opts?.protectMaxIndex;
  for (let i = 1; i < next.length; i++) {
    const prev = next[i - 1]!;
    if (prev.maxQty != null && Number.isFinite(prev.maxQty) && prev.maxQty >= TIER_QTY_EPSILON) {
      const chainedMin = nextTierMinAfter(prev.maxQty);
      next[i] = { ...next[i]!, minQty: chainedMin };
    }
    const row = next[i]!;
    if (
      row.maxQty != null
      && row.maxQty < row.minQty
      && protect !== i
    ) {
      next[i] = { ...row, maxQty: null };
    }
  }
  return next;
}


export function normalizeOptionFlags(flags: {
  impactsPrice?: boolean;
  isInformational?: boolean;
}): { impactsPrice: boolean; isInformational: boolean } {
  let impactsPrice = Boolean(flags.impactsPrice);
  let isInformational = Boolean(flags.isInformational);
  if (impactsPrice && isInformational) {
    isInformational = false;
  }
  if (isInformational) {
    impactsPrice = false;
  }
  return { impactsPrice, isInformational };
}
