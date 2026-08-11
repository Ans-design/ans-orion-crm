'use client';

import { clearCart, dispatchCartUpdated, getCart } from '@/lib/cart-store';
import {
  getSelectedSalesClient,
  setSelectedSalesClient,
  type SalesClientSnapshot,
} from './sales-client-store';

export function cartHasItems(): boolean {
  return getCart().length > 0;
}

export function resetCartOnly(): void {
  clearCart();
  dispatchCartUpdated();
}

/** Nouvelle commande pour le client actuel — panier vidé, client conservé */
export function startNewOrderForCurrentClient(): void {
  resetCartOnly();
}

/** Nouvelle commande pour un autre client — panier vidé, client désélectionné */
export function startNewOrderForOtherClient(): void {
  resetCartOnly();
  setSelectedSalesClient(null, { skipCartClear: true });
}

export function applyClientSelection(
  client: SalesClientSnapshot | null,
  options?: { skipCartClear?: boolean },
): void {
  setSelectedSalesClient(client, options);
}

export function needsClientChangeConfirmation(next: SalesClientSnapshot | null): boolean {
  if (!cartHasItems()) return false;
  const prev = getSelectedSalesClient();
  if (!next?.id) return cartHasItems();
  return prev?.id !== next.id;
}
