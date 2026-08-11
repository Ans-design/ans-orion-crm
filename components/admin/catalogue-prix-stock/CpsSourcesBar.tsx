'use client';

import { cn } from '@/lib/utils';

type Props = {
  /** Labels techniques (dev / staging / admin) vs message métier production. */
  technical?: boolean;
  className?: string;
};

/**
 * Barre des sources sous les tabs Studio Prix — hauteur fixe ~29px
 * pour stabiliser la géométrie (capture 2026-07-20).
 */
export function CpsSourcesBar({ technical = true, className }: Props) {
  if (!technical) {
    return (
      <div
        className={cn('cps-sources-bar', className)}
        role="status"
        aria-label="Source de tarification"
      >
        <span className="cps-sources-bar__metier">
          Tarification centrale synchronisée avec les devis et le POS.
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn('cps-sources-bar', className)}
      role="status"
      aria-label="Sources tarifaires techniques"
    >
      <p className="cps-sources-bar__left">
        <span className="cps-sources-bar__label">Profils</span>{' '}
        <code className="cps-sources-bar__code">ArticlePricingProfile</code>
        <span className="cps-sources-bar__sep" aria-hidden>
          ·
        </span>
        <span className="cps-sources-bar__label">formules</span>{' '}
        <code className="cps-sources-bar__code">FormulaVersion published</code>
        <span className="cps-sources-bar__sep" aria-hidden>
          ·
        </span>
        <span className="cps-sources-bar__label">options</span>{' '}
        <code className="cps-sources-bar__code">ProductOptionGroup/Value</code>
      </p>
      <span className="cps-sources-bar__fallback">SalePrice2026 fallback</span>
    </div>
  );
}
