'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { uxToast, UX_MSG, classifyFetchError } from '@/lib/ux/feedback';
import { getApiErrorMessage, unwrapApiData } from '@/lib/api-client';
import {
  type CartItem,
  clearCart,
  dispatchCartUpdated,
  duplicateCartItem,
  getCart,
  logCartAudit,
  removeFromCart,
  saveCart,
  setCartUserId,
  updateCartItem,
} from '@/lib/cart-store';
import type { CartTotals, ValidatedCartLine } from '@/lib/services/cart-service';
import { computeClientTotals } from '@/components/panier/cart-summary';
import type { CartCheckoutAction } from '@/components/panier/cart-actions';
import type { DevisValidationMeta } from '@/lib/devis-meta';
import { sanitizeCartItemConfig } from '@/lib/cart-config-sanitize';
import { cartItemEditHref } from '@/lib/pos/cart-edit-nav';
import { appendPosQueryParam } from '@/lib/pos/catalog-nav';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import {
  getSelectedSalesClient,
  setSelectedSalesClient,
  setSalesFlowUserId,
} from '@/lib/sales-flow/sales-client-store';

type LoadState = 'loading' | 'ready' | 'error';

function toPayloadItems(items: CartItem[]) {
  return items.map((i) => ({
    id: i.id,
    articleId: i.articleId,
    name: i.name,
    category: i.category,
    config: sanitizeCartItemConfig(i.config),
    quantity: Number(i.quantity) || 1,
  }));
}

export function useCartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const commandeQueryId = searchParams.get('commande');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [remise, setRemise] = useState(0);
  const [acomptePct, setAcomptePct] = useState(0);
  const [livraison, setLivraison] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loadingAction, setLoadingAction] = useState<CartCheckoutAction | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [validation] = useState<DevisValidationMeta>({
    modeExpedition: 'Livraison',
    delaiExecution: '3 jours ouvrés',
    priorite: 'Normale',
    modePaiement: 'Complet',
    avancePct: 30,
    canalPaiement: 'Espèces',
    statutValidation: 'En attente client',
    notesLibres: '',
  });
  const syncedRef = useRef(false);
  const [linkedClientId, setLinkedClientId] = useState('');

  useEffect(() => {
    const syncId = () => setLinkedClientId(getSelectedSalesClient()?.id ?? '');
    syncId();
    window.addEventListener('salesClientChanged', syncId);
    return () => window.removeEventListener('salesClientChanged', syncId);
  }, []);

  const validateAndMerge = useCallback(async (localItems: CartItem[]) => {
    if (localItems.length === 0) {
      setCart([]);
      return [];
    }
    const res = await fetchWithTimeout('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 12_000,
      body: JSON.stringify({
        items: toPayloadItems(localItems),
        meta: { remise, acomptePct, livraison },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = getApiErrorMessage(err, '');
      if (res.status === 401 && msg.includes('Session invalide')) {
        const local = getCart();
        setCart(local);
        setLoadState('ready');
        return;
      }
      throw new Error(msg || 'Validation panier échouée');
    }
    const raw = await res.json();
    const data = unwrapApiData<{ items?: ValidatedCartLine[]; totals?: CartTotals }>(raw);
    const merged: CartItem[] = (data.items ?? []).map((srv: ValidatedCartLine, idx: number) => ({
      id: srv.id || localItems[idx]?.id || `item-${idx}`,
      articleId: srv.articleId,
      name: srv.name,
      category: srv.category,
      config: srv.config ?? srv.configSnapshot ?? localItems[idx]?.config ?? {},
      quantity: srv.quantity,
      prixUnitaire: srv.prixUnitaire,
      totalLigne: srv.totalLigne,
    }));
    saveCart(merged);
    setCart(merged);
    dispatchCartUpdated();
    return merged;
  }, [remise, acomptePct, livraison]);

  const refreshCart = useCallback(async () => {
    setLoadState('loading');
    setError(null);
    try {
      const local = getCart();
      if (local.length === 0) {
        const res = await fetchWithTimeout('/api/cart', { timeout: 12_000 });
        if (res.ok) {
          const raw = await res.json();
          const data = unwrapApiData<{
            items?: ValidatedCartLine[];
            meta?: { remise?: number; acomptePct?: number; livraison?: number; clientId?: string };
          }>(raw);
          if (Array.isArray(data.items) && data.items.length > 0) {
            const fromServer: CartItem[] = data.items.map((srv: ValidatedCartLine) => ({
              id: srv.id,
              articleId: srv.articleId,
              name: srv.name,
              category: srv.category,
              config: srv.config ?? srv.configSnapshot ?? {},
              quantity: srv.quantity,
              prixUnitaire: srv.prixUnitaire,
              totalLigne: srv.totalLigne,
            }));
            saveCart(fromServer);
            setCart(fromServer);
            if (data.meta?.remise != null) setRemise(data.meta.remise);
            if (data.meta?.acomptePct != null) setAcomptePct(data.meta.acomptePct);
            if (data.meta?.livraison != null) setLivraison(data.meta.livraison);
            if (data.meta?.clientId) setSelectedClientId(data.meta.clientId);
          } else {
            setCart([]);
          }
        } else {
          setCart([]);
        }
        if (!res.ok && res.status === 401) {
          setCart(getCart());
        }
      } else {
        const sanitizedLocal = local.map((item) => ({
          ...item,
          config: sanitizeCartItemConfig(item.config),
          quantity: Number(item.quantity) || 1,
        }));
        saveCart(sanitizedLocal);
        await validateAndMerge(sanitizedLocal);
      }
      setLoadState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement panier');
      setCart(getCart());
      setLoadState('error');
    }
  }, [validateAndMerge]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/login?redirect=/panier');
      return;
    }
    const userId = (session?.user as { id?: string })?.id;
    setCartUserId(userId ?? null);
    setSalesFlowUserId(userId ?? null);
    const salesClient = getSelectedSalesClient();
    if (salesClient?.id) setSelectedClientId(salesClient.id);
    if (!syncedRef.current) {
      syncedRef.current = true;
      refreshCart();
    }
  }, [status, session, router, refreshCart]);

  useEffect(() => {
    const handler = () => setCart(getCart());
    const onClient = () => {
      const sc = getSelectedSalesClient();
      if (sc?.id) setSelectedClientId(sc.id);
    };
    window.addEventListener('cartUpdated', handler);
    window.addEventListener('salesClientChanged', onClient);
    return () => {
      window.removeEventListener('cartUpdated', handler);
      window.removeEventListener('salesClientChanged', onClient);
    };
  }, []);

  const totals: CartTotals = useMemo(
    () => computeClientTotals(cart, remise, acomptePct, livraison),
    [cart, remise, acomptePct, livraison],
  );

  const cartTotalQuantity = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const cartLineCount = cart.length;

  const syncMeta = () => {
    const salesClient = getSelectedSalesClient();
    const clientId = salesClient?.id || selectedClientId || null;
    return {
      remise,
      acomptePct,
      livraison,
      clientId,
      validation: { ...validation, avancePct: acomptePct || validation.avancePct },
    };
  };

  const handleQtyChange = async (id: string, qty: number) => {
    if (qty < 1) return;
    const updated = updateCartItem(id, { quantity: qty });
    setCart(updated);
    try {
      await validateAndMerge(updated);
      await logCartAudit('CART_UPDATE', `Qté modifiée — ${id}`, { id, qty });
    } catch {
      uxToast.error(null, 'Erreur recalcul des prix');
    }
  };

  const handleRemove = async (id: string) => {
    const updated = removeFromCart(id);
    setCart(updated);
    dispatchCartUpdated();
    await logCartAudit('CART_REMOVE', `Article retiré`, { id });
    uxToast.success(UX_MSG.cartItemRemoved);
    if (updated.length) {
      try {
        await validateAndMerge(updated);
      } catch {
        uxToast.error(null, 'Erreur recalcul des prix');
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    const updated = duplicateCartItem(id);
    setCart(updated);
    dispatchCartUpdated();
    await logCartAudit('CART_DUPLICATE', `Article dupliqué`, { id });
    uxToast.success(UX_MSG.cartItemDuplicated);
    try {
      await validateAndMerge(updated);
    } catch {
      uxToast.error(null, 'Erreur recalcul des prix');
    }
  };

  const handleEdit = (item: CartItem) => {
    router.push(cartItemEditHref(item));
  };

  const handleContinuePos = () =>
    router.push(appendPosQueryParam('/pos', 'commande', commandeQueryId));

  const runCheckout = async (action: CartCheckoutAction) => {
    if (action === 'clear') {
      setShowClearConfirm(true);
      return;
    }
    if (!selectedClientId && !getSelectedSalesClient()?.id) {
      uxToast.error(null, UX_MSG.clientRequired);
      return;
    }
    if (cart.length === 0) {
      uxToast.error(null, UX_MSG.cartEmpty);
      return;
    }
    setLoadingAction(action);
    try {
      const merged = await validateAndMerge(cart);
      const itemsForCheckout = Array.isArray(merged) && merged.length > 0 ? merged : cart;
      const res = await fetchWithTimeout('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
        body: JSON.stringify({
          action: 'devis',
          items: toPayloadItems(itemsForCheckout),
          meta: syncMeta(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        uxToast.error(getApiErrorMessage(body, 'Impossible de créer le devis'));
        return;
      }
      const data = unwrapApiData<{ devis?: { id?: string; numero?: string } }>(body);
      clearCart();
      setCart([]);
      dispatchCartUpdated();
      uxToast.success(UX_MSG.devisCreated(data.devis?.numero));
      const devisId = data.devis?.id;
      void import('@/lib/commercial/commercial-journey-store').then(({ emitCommercialJourney }) => {
        emitCommercialJourney('checkout_done', {
          cartCount: 0,
          lastDevisId: devisId ?? null,
        });
      });
      router.push(devisId ? `/devis?highlight=${devisId}` : '/devis');
    } catch (e) {
      uxToast.error(e, UX_MSG.loadFailed);
    } finally {
      setLoadingAction(null);
    }
  };

  const confirmClear = async () => {
    setLoadingAction('clear');
    try {
      const res = await fetchWithTimeout('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
        body: JSON.stringify({ action: 'clear' }),
      });
      if (!res.ok) {
        uxToast.error(null, 'Impossible de vider le panier');
        return;
      }
      clearCart();
      setCart([]);
      dispatchCartUpdated();
      uxToast.success('Panier vidé');
      setShowClearConfirm(false);
    } catch (e) {
      uxToast.error(e, UX_MSG.loadFailed);
    } finally {
      setLoadingAction(null);
    }
  };

  return {
    cart,
    loadState,
    error,
    totals,
    cartLineCount,
    cartTotalQuantity,
    remise,
    setRemise,
    acomptePct,
    setAcomptePct,
    livraison,
    setLivraison,
    selectedClientId,
    setSelectedClientId,
    loadingAction,
    showClearConfirm,
    setShowClearConfirm,
    refreshCart,
    handleQtyChange,
    handleRemove,
    handleDuplicate,
    handleEdit,
    handleContinuePos,
    runCheckout,
    confirmClear,
    isAuthenticated: status === 'authenticated',
    hasClient: !!(linkedClientId || selectedClientId),
  };
}
