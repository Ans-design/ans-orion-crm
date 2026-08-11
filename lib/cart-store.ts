'use client';

export interface CartItem {
  id: string;
  articleId: string;
  name: string;
  category: string;
  config: Record<string, unknown>;
  quantity: number;
  prixUnitaire: number;
  totalLigne: number;
  clientId?: string;
  clientSnapshot?: { id: string; name: string; tel?: string | null; email?: string | null; nif?: string | null };
  addedAt?: string;
}

const LEGACY_CART_KEY = 'ans_orion_cart';
const LEGACY_DRAFT_KEY = 'ans_orion_cart_draft';
/** Marqueur migration panier V4 — localStorage = cache, serveur = vérité prix. */
export const CART_STORAGE_VERSION = 2;
const CART_VERSION_KEY = 'ans_orion_cart_version';

let _cartUserId: string | null = null;

export function setCartUserId(userId: string | null): void {
  _cartUserId = userId;
}

export function getCartUserId(): string | null {
  return _cartUserId;
}

function cartKey(): string {
  return _cartUserId ? `ans_orion_cart_${_cartUserId}` : LEGACY_CART_KEY;
}

function draftKey(): string {
  return _cartUserId ? `ans_orion_cart_draft_${_cartUserId}` : LEGACY_DRAFT_KEY;
}

function migrateLegacyCart(): void {
  if (typeof window === 'undefined' || !_cartUserId) return;
  try {
    const ver = Number(localStorage.getItem(CART_VERSION_KEY) || '0');
    if (ver < CART_STORAGE_VERSION) {
      localStorage.setItem(CART_VERSION_KEY, String(CART_STORAGE_VERSION));
    }
  } catch { /* ignore */ }
  const key = cartKey();
  if (localStorage.getItem(key)) return;
  const legacy = localStorage.getItem(LEGACY_CART_KEY);
  if (legacy) {
    localStorage.setItem(key, legacy);
    localStorage.removeItem(LEGACY_CART_KEY);
  }
  const legacyDraft = localStorage.getItem(LEGACY_DRAFT_KEY);
  if (legacyDraft && !localStorage.getItem(draftKey())) {
    localStorage.setItem(draftKey(), legacyDraft);
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  }
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  migrateLegacyCart();
  try {
    const raw = localStorage.getItem(cartKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(cartKey(), JSON.stringify(items ?? []));
}

export function addToCart(item: CartItem): CartItem[] {
  const cart = getCart();
  cart.push({
    ...item,
    id: item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });
  saveCart(cart);
  return cart;
}

export function removeFromCart(id: string): CartItem[] {
  const cart = getCart().filter((i) => i?.id !== id);
  saveCart(cart);
  return cart;
}

export function updateCartItem(id: string, updates: Partial<CartItem>): CartItem[] {
  const cart = getCart().map((i) => {
    if (i?.id === id) {
      const updated = { ...i, ...updates };
      updated.totalLigne = (updated.prixUnitaire ?? 0) * (updated.quantity ?? 1);
      return updated;
    }
    return i;
  });
  saveCart(cart);
  return cart;
}

export function duplicateCartItem(id: string): CartItem[] {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return cart;
  const copy: CartItem = {
    ...item,
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    config: JSON.parse(JSON.stringify(item.config)),
  };
  cart.push(copy);
  saveCart(cart);
  return cart;
}

export function clearCart(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(cartKey());
}

export function saveCartDraft(): void {
  if (typeof window === 'undefined') return;
  const cart = getCart();
  if (cart.length) localStorage.setItem(draftKey(), JSON.stringify(cart));
}

export function loadCartDraft(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(draftKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function restoreCartDraft(): CartItem[] {
  const draft = loadCartDraft();
  if (draft.length) saveCart(draft);
  return draft;
}

export function clearCartDraft(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(draftKey());
}

const FAV_KEY = 'ans_orion_favorites';
const RECENT_KEY = 'ans_orion_recent_articles';
const RECENT_MAX = 12;
const PREFS_KEY = 'ans_orion_prefs';

export function getFavoriteIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(articleId: string): string[] {
  const ids = getFavoriteIds();
  const next = ids.includes(articleId) ? ids.filter((id) => id !== articleId) : [...ids, articleId];
  if (typeof window !== 'undefined') localStorage.setItem(FAV_KEY, JSON.stringify(next));
  return next;
}

export function getRecentArticleIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Enregistre un article consulté (ordre anti-chronologique, max 12). */
export function trackRecentArticle(articleId: string): string[] {
  if (!articleId?.trim()) return getRecentArticleIds();
  const ids = getRecentArticleIds().filter((id) => id !== articleId);
  const next = [articleId, ...ids].slice(0, RECENT_MAX);
  if (typeof window !== 'undefined') {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('recentsUpdated'));
  }
  return next;
}

export function getCartLineCount(items?: CartItem[]): number {
  return (items ?? getCart()).length;
}

/** Quantité totale de production (somme des quantités par ligne) — ne pas utiliser pour le badge panier */
export function getCartTotalQuantity(items?: CartItem[]): number {
  return (items ?? getCart()).reduce((sum, i) => sum + (i?.quantity ?? 0), 0);
}

export function getCartTotal(items: CartItem[]): { sousTotal: number; lineCount: number; totalQuantity: number } {
  const arr = items ?? [];
  return {
    sousTotal: arr.reduce((sum, i) => sum + (i?.totalLigne ?? 0), 0),
    lineCount: arr.length,
    totalQuantity: arr.reduce((sum, i) => sum + (i?.quantity ?? 0), 0),
  };
}

export function getPrefs(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs: Record<string, unknown>): void {
  if (typeof window !== 'undefined') localStorage.setItem(PREFS_KEY, JSON.stringify(prefs ?? {}));
}

export function dispatchCartUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cartUpdated'));
  }
}

export async function logCartAudit(
  action: string,
  entityLabel: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch('/api/pos/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, entity: 'Panier', entityLabel, details }),
    });
  } catch {
    /* ignore */
  }
}
