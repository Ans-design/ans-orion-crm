'use client';

import { useCallback, useEffect, useState } from 'react';

type Props = {
  onOpenParity?: () => void;
  onOpenProducts?: () => void;
};

/**
 * Bandeau santé Finitions & règles — sans compteurs « bibliothèque options ».
 */
export function OptionsFinitionsHealthStrip({ onOpenParity, onOpenProducts }: Props) {
  const [productsWithConfig, setProductsWithConfig] = useState(0);

  const load = useCallback(async () => {
    try {
      const pricingRes = await fetch('/api/dynamic-pricing', { cache: 'no-store' }).catch(() => null);
      const pricing = pricingRes?.ok ? await pricingRes.json() : null;
      const profiles = (pricing?.profiles ?? []) as Array<{
        optionGroups?: { visiblePos?: boolean }[];
      }>;
      const withOptions = profiles.filter((p) => (p.optionGroups?.length ?? 0) > 0).length;
      setProductsWithConfig(withOptions);
    } catch {
      /* KPI optionnels */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="cps-mini-kpi-row" role="group" aria-label="Santé finitions">
      <span>
        <strong>{productsWithConfig}</strong> produits avec configuration POS
      </span>
      {onOpenProducts ? (
        <button type="button" onClick={onOpenProducts} title="Ouvrir Produits">
          Voir les produits →
        </button>
      ) : null}
      {onOpenParity ? (
        <button type="button" onClick={onOpenParity} title="Diagnostics parité">
          Diagnostics POS →
        </button>
      ) : null}
    </div>
  );
}
