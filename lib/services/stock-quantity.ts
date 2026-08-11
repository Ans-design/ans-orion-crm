/**
 * Calculs stock purs — Lot 4 (idempotence / cohérence qty).
 * Aucune I/O DB ici.
 */

export type StockQtyItem = {
  quantity: number;
  reservedQty?: number | null;
  unit?: string | null;
};

export type StockMovementKind = 'entree' | 'sortie' | 'ajustement';

const SORTIE_LABELS = new Set([
  'sortie',
  'perte',
  'production',
  'vente_directe',
  'transfert',
]);

const ENTREE_LABELS = new Set(['entree', 'retour']);

/** Stock disponible = réel − réservé (≥ 0). */
export function stockAvailable(item: {
  quantity: number;
  reservedQty?: number | null;
}): number {
  return Math.max(0, item.quantity - (item.reservedQty ?? 0));
}

/** Refuse un débit supérieur au disponible (vente / production). */
export function assertDebitAllowed(
  item: { quantity: number; reservedQty?: number | null; unit?: string | null },
  debitQty: number,
): void {
  const debit = Math.abs(debitQty);
  if (!(debit > 0)) {
    throw new Error('Quantité de sortie invalide');
  }
  const available = stockAvailable(item);
  if (debit > available) {
    const unit = item.unit ?? 'unité';
    throw new Error(
      `Stock disponible insuffisant (${Math.floor(available)} ${unit}, demandé ${debit})`,
    );
  }
}

/** Libération de réservation : qty réservée après release (≥ 0). */
export function computeReservedAfterRelease(
  reservedQty: number,
  releaseQty: number,
): number {
  return Math.max(0, Math.max(0, reservedQty) - Math.abs(releaseQty));
}

/**
 * Consommation production : débit physique + baisse du réservé (disponible inchangé).
 * Refuse si stock physique ou réservé insuffisant.
 */
export function computeStockAfterReservationConsume(
  item: { quantity: number; reservedQty?: number | null },
  consumeQty: number,
): { quantity: number; reservedQty: number } {
  const qty = Math.abs(consumeQty);
  if (!(qty > 0)) throw new Error('Quantité de consommation invalide');
  const reserved = Math.max(0, item.reservedQty ?? 0);
  if (qty > item.quantity + 1e-9) {
    throw new Error(
      `Stock physique insuffisant pour consommation (${Math.floor(item.quantity)} / ${qty})`,
    );
  }
  if (qty > reserved + 1e-9) {
    throw new Error(
      `Réservé insuffisant pour consommation (${Math.floor(reserved)} / ${qty})`,
    );
  }
  return {
    quantity: item.quantity - qty,
    reservedQty: reserved - qty,
  };
}

/** Simulateur concurrence : deux débits sur le dernier stock — un seul réussit. */
export function simulateConcurrentDebits(
  available: number,
  intents: number[],
): { successes: number; failures: number; remaining: number } {
  let remaining = Math.max(0, available);
  let successes = 0;
  let failures = 0;
  for (const qty of intents) {
    const q = Math.abs(qty);
    if (q > 0 && q <= remaining) {
      remaining -= q;
      successes += 1;
    } else {
      failures += 1;
    }
  }
  return { successes, failures, remaining };
}

/** Mappe le libellé métier vers entree | sortie | ajustement. */
export function resolveMovementDeltaKind(
  movementLabel: string,
  fallbackType: StockMovementKind,
): StockMovementKind {
  if (SORTIE_LABELS.has(movementLabel)) return 'sortie';
  if (ENTREE_LABELS.has(movementLabel)) return 'entree';
  return fallbackType;
}

/** Quantité réelle après mouvement (avant contrôles réservation). */
export function computeNextStockQuantity(
  currentQuantity: number,
  type: StockMovementKind,
  quantity: number,
  movementLabel?: string,
): number {
  if (type === 'ajustement') return quantity;
  const kind = resolveMovementDeltaKind(movementLabel ?? type, type);
  const delta = kind === 'sortie' ? -Math.abs(quantity) : Math.abs(quantity);
  return currentQuantity + delta;
}

export function assertStockQuantityConsistency(
  item: StockQtyItem,
  nextQuantity: number,
): void {
  const reservedQty = Math.max(0, item.reservedQty ?? 0);
  if (nextQuantity < 0) {
    throw new Error('Stock insuffisant');
  }
  if (nextQuantity < reservedQty) {
    const unit = item.unit ?? 'unité';
    throw new Error(
      `Mouvement refusé: stock réel (${nextQuantity}) inférieur au stock réservé (${reservedQty} ${unit})`,
    );
  }
}

/** Clé d’idempotence mouvement : référence non vide requise. */
export function buildMovementIdempotencyWhere(params: {
  stockItemId: string;
  type: string;
  quantity: number;
  reference?: string | null;
  commandeId?: string | null;
}): {
  stockItemId: string;
  type: string;
  quantity: number;
  reference: string;
  commandeId?: string;
} | null {
  const reference = params.reference?.trim();
  if (!reference) return null;
  const where: {
    stockItemId: string;
    type: string;
    quantity: number;
    reference: string;
    commandeId?: string;
  } = {
    stockItemId: params.stockItemId,
    type: params.type,
    quantity: Math.abs(params.quantity),
    reference,
  };
  if (params.commandeId) where.commandeId = params.commandeId;
  return where;
}
