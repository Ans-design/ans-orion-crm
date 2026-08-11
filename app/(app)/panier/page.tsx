'use client';

import { Suspense } from 'react';
import { ShoppingCart } from 'lucide-react';
import { OrionPageHeader, OrionConfirmDialog } from '@/components/orion';
import { AppModuleShell } from '@/components/ui/app-ui';
import { CartEmptyState } from '@/components/panier/cart-empty-state';
import { CartSkeleton, CartErrorState } from '@/components/panier/cart-skeleton';
import { CartItemCard } from '@/components/panier/cart-item-card';
import { CartSummary } from '@/components/panier/cart-summary';
import { CartActions } from '@/components/panier/cart-actions';
import { useCartPage } from '@/hooks/use-cart';
import { clearCart } from '@/lib/cart-store';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { SalesClientBanner } from '@/components/sales-flow/sales-client-banner';
import { useSalesClient } from '@/lib/sales-flow/use-sales-client';
import { PosOrderFlowProvider, usePosOrderFlow } from '@/components/sales-flow/pos-order-flow-provider';

function PanierPageInner() {
  const { info: commandeLinkInfo } = useCommandeDeepLink();
  const { client: salesClient } = useSalesClient();
  const { openClientSearch, requestClientChange, requestNewOrder } = usePosOrderFlow();
  const {
    cart,
    loadState,
    error,
    totals,
    remise,
    setRemise,
    acomptePct,
    setAcomptePct,
    livraison,
    setLivraison,
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
    isAuthenticated,
    hasClient,
  } = useCartPage();

  if (!isAuthenticated && loadState === 'loading') {
    return <CartSkeleton />;
  }

  if (loadState === 'loading') {
    return <CartSkeleton />;
  }

  if (loadState === 'error') {
    return (
      <AppModuleShell>
        <OrionPageHeader title="Panier / Devis" description="Récapitulatif commercial" compact icon={ShoppingCart} />
        <CartErrorState
          message={error ?? 'Erreur inconnue'}
          onRetry={refreshCart}
          onClear={async () => {
            clearCart();
            await fetch('/api/cart/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'clear' }),
            }).catch(() => { console.warn('[panier] fetch secondary failed'); });
            window.location.reload();
          }}
        />
      </AppModuleShell>
    );
  }

  const isBusy = !!loadingAction;
  const activeClient = salesClient;

  return (
    <AppModuleShell className="pb-8">
      <OrionPageHeader
        title="Panier / Devis"
        description={
          cart.length > 0
            ? `${cart.length} ligne${cart.length > 1 ? 's' : ''} — client requis pour le devis`
            : 'Préparez un devis à partir du catalogue POS'
        }
        compact
        icon={ShoppingCart}
        actions={
          cart.length > 0 ? (
            <span className="inline-flex items-center gap-2 h-10 px-3 text-sm text-[var(--text-muted)] orion-card">
              <ShoppingCart size={16} strokeWidth={1.75} className="text-primary" />
              <span className="font-mono font-semibold text-[var(--text-primary)]">{cart.length}</span>
              <span>ligne{cart.length > 1 ? 's' : ''}</span>
            </span>
          ) : undefined
        }
      />

      {commandeLinkInfo && <CommandeDeepLinkBanner info={commandeLinkInfo} />}

      {!activeClient?.id && (
        <div className="orion-card bg-amber-500/10 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3 min-h-[2.75rem]">
          <span>Sélectionnez un client CRM avant de finaliser un devis.</span>
          <button
            type="button"
            onClick={openClientSearch}
            className="font-semibold text-primary hover:underline text-sm"
          >
            Choisir un client
          </button>
        </div>
      )}

      {activeClient?.id && (
        <SalesClientBanner
          client={activeClient}
          onChangeClient={requestClientChange}
          onNewOrder={requestNewOrder}
        />
      )}
      {!hasClient && cart.length > 0 && (
        <p className="orion-ux-hint px-1" role="status">
          Sélectionnez un client CRM pour créer le devis — le panier est prêt.
        </p>
      )}

      {cart.length === 0 ? (
        <CartEmptyState />
      ) : (
        <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <div className="flex-1 space-y-4 min-w-0">
            {cart.map((item, index) => (
              <CartItemCard
                key={item.id}
                item={item}
                index={index}
                onQtyChange={handleQtyChange}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onRemove={handleRemove}
                busy={isBusy}
              />
            ))}
          </div>

          <aside className="w-full xl:w-auto shrink-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
            <CartSummary
              totals={totals}
              remise={remise}
              acomptePct={acomptePct}
              livraison={livraison}
              onRemiseChange={setRemise}
              onAcompteChange={setAcomptePct}
              onLivraisonChange={setLivraison}
              disabled={isBusy}
            />
            <CartActions
              onAddArticle={handleContinuePos}
              onAction={runCheckout}
              loadingAction={loadingAction}
              disabled={isBusy}
              hasItems={cart.length > 0}
              hasClient={hasClient}
            />
          </aside>
        </div>
      )}

      <OrionConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Vider le panier"
        description="Supprimer tous les articles ? Cette action est irréversible."
        confirmLabel="Vider le panier"
        variant="destructive"
        onConfirm={confirmClear}
      />
    </AppModuleShell>
  );
}

export default function PanierPage() {
  return (
    <PosOrderFlowProvider>
      <Suspense fallback={<CartSkeleton />}>
        <PanierPageInner />
      </Suspense>
    </PosOrderFlowProvider>
  );
}
