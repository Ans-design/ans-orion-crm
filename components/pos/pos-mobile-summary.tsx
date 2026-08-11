'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronUp, ShoppingCart, Send } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { PosPriceCalc } from '@/components/pos/pos-summary-content';
import { useBottomActionStackOptional } from '@/components/responsive/bottom-action-stack';

type PosMobileSummaryProps = {
  isReady: boolean;
  canAddToCart?: boolean;
  canCreateQuoteDraft?: boolean;
  pricePending?: boolean;
  priceReady?: boolean;
  priceLoading?: boolean;
  disabledReason?: string | null;
  priceCalc: PosPriceCalc;
  onAddToCart: () => void;
  onCreateQuoteDraft?: () => void;
  quoteDraftLoading?: boolean;
  editMode?: boolean;
  children: React.ReactNode;
};

export function PosMobileSummary({
  isReady,
  canAddToCart: canAddToCartProp,
  canCreateQuoteDraft = false,
  pricePending = false,
  priceReady = true,
  priceLoading = false,
  disabledReason,
  priceCalc,
  onAddToCart,
  onCreateQuoteDraft,
  quoteDraftLoading = false,
  editMode = false,
  children,
}: PosMobileSummaryProps) {
  const canAddToCart = canAddToCartProp ?? (isReady && priceReady);
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const stack = useBottomActionStackOptional();
  const setLayerHeight = stack?.setLayerHeight;
  const offsetAbove = stack?.offsetAbove;

  useEffect(() => {
    if (!setLayerHeight) return;
    const el = barRef.current;
    const apply = () => setLayerHeight('posSummary', el?.offsetHeight ?? 88);
    apply();
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(apply) : null;
    if (el && ro) ro.observe(el);
    return () => {
      ro?.disconnect();
      setLayerHeight('posSummary', 0);
    };
  }, [setLayerHeight]);

  const statusLabel = priceLoading
    ? 'Calcul prix…'
    : !isReady
      ? 'À compléter'
      : pricePending && !priceReady
        ? 'Prix à valider'
        : !priceReady
          ? 'Prix manquant'
          : 'Prêt';

  const priceLabel = priceCalc.calculable
    ? `${formatPrice(priceCalc.totalHT)} Ar`
    : pricePending
      ? 'Prix final à valider'
      : 'Prix à définir';

  const bottomPx = offsetAbove ? offsetAbove('posSummary') : 0;

  return (
    <>
      <div
        ref={barRef}
        className="md:hidden fixed inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md safe-area-pb"
        style={{
          bottom: bottomPx,
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="px-4 pt-3 pb-2 space-y-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex-1 min-w-0 text-left rounded-[7px] bg-card border border-border px-3 py-2.5 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {statusLabel}
                  </p>
                  <p className={`font-mono font-bold truncate ${pricePending && !priceCalc.calculable ? 'text-amber-800 dark:text-amber-300 text-sm' : 'text-primary'}`}>
                    {priceLabel}
                  </p>
                </div>
                <ChevronUp size={18} className="text-muted-foreground shrink-0" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Voir synthèse & tarif</p>
            </button>
            {canCreateQuoteDraft && onCreateQuoteDraft ? (
              <button
                type="button"
                onClick={onCreateQuoteDraft}
                disabled={quoteDraftLoading}
                className="shrink-0 bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-100 font-bold px-3 py-3 rounded-[7px] transition-all flex items-center gap-1.5 disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)]"
                aria-label="Créer demande de devis"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onAddToCart}
                disabled={!canAddToCart}
                aria-disabled={!canAddToCart}
                title={!canAddToCart ? (disabledReason ?? undefined) : undefined}
                className="shrink-0 ans-btn-primary font-bold px-4 py-3 rounded-[7px] transition-all flex items-center gap-2 shadow-[0_4px_14px_rgba(255,23,77,0.28)] disabled:shadow-none"
                aria-label={editMode ? 'Enregistrer et revenir au panier' : 'Ajouter au panier'}
              >
                <ShoppingCart size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[88vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="font-display text-base">Synthèse & tarification</SheetTitle>
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    </>
  );
}
