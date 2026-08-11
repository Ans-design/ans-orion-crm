'use client';

import Link from 'next/link';
import { Settings2, FileText, CheckCircle2 } from 'lucide-react';
import type { PosPriceMode } from '@/lib/pos/pos-price-policy';
import { posPriceModeLabel } from '@/lib/pos/pos-price-policy';

type Props = {
  articleName?: string;
  priceMode: PosPriceMode;
  reason?: string | null;
  adminHref?: string;
  onCreateQuoteDraft?: () => void;
  quoteDraftLoading?: boolean;
};

export function PosPricePendingBanner({
  articleName,
  priceMode,
  reason,
  adminHref = '/administration/catalogue-pos',
  onCreateQuoteDraft,
  quoteDraftLoading = false,
}: Props) {
  const isQuote = priceMode === 'quote_required';

  return (
    <div className="rounded-[7px] border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/8 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Settings2 size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
              {isQuote ? 'Sur devis — configuration possible' : 'Prix à configurer — configuration possible'}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] flex items-center gap-1">
              <CheckCircle2 size={10} /> Configurable
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-background/60 border border-border text-muted-foreground">
              {posPriceModeLabel(priceMode)}
            </span>
          </div>
          {articleName && (
            <p className="text-xs text-muted-foreground mt-1">{articleName}</p>
          )}
          <p className="text-xs text-amber-800 dark:text-amber-200/90 mt-1">
            {reason ?? 'Le prix final sera validé par l’administration. Vous pouvez préparer la configuration client et créer un devis brouillon.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onCreateQuoteDraft && (
          <button
            type="button"
            disabled={quoteDraftLoading}
            onClick={onCreateQuoteDraft}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary transition-colors disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)]"
          >
            <FileText size={14} />
            {quoteDraftLoading ? 'Création…' : 'Créer devis brouillon'}
          </button>
        )}
        <Link
          href={adminHref}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          Configurer prix (Admin)
        </Link>
      </div>
    </div>
  );
}
