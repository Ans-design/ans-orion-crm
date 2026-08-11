'use client';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ProductConfig } from '@/lib/data/config-types';
import {
  collectPosProgressFields,
  isFieldValueComplete,
} from '@/lib/pos/initial-config';

type Props = {
  productConfig: ProductConfig | null;
  config: Record<string, unknown>;
  isReady: boolean;
  priceReady?: boolean;
  priceLoading?: boolean;
  priceError?: string | null;
  completion: { done: number; total: number; pct: number };
  onFocusField?: (fieldKey: string) => void;
  /**
   * `alerts-only` — pas de chips « champs restants » (déjà dans le stepper).
   * Garde uniquement états prix / config complète.
   */
  variant?: 'full' | 'alerts-only';
};

/** Bandeau Soft UI — manquants en chips cliquables (pas de mur jaune) */
export function PosMissingFieldsBanner({
  productConfig,
  config,
  isReady,
  priceReady = true,
  priceLoading = false,
  priceError = null,
  completion,
  onFocusField,
  variant = 'full',
}: Props) {
  const missing = collectPosProgressFields(productConfig, config).filter(
    (field) => !isFieldValueComplete(field, config[field.key], config),
  );

  if (isReady && priceLoading) {
    return (
      <div className="pos-soft-alert pos-soft-alert--neutral">
        <Loader2 size={14} className="shrink-0 animate-spin" />
        <span>Calcul du prix en cours…</span>
      </div>
    );
  }

  if (isReady && !priceReady) {
    return (
      <div className="pos-soft-alert pos-soft-alert--warn">
        <AlertCircle size={14} className="shrink-0" />
        <span>{priceError ?? 'Tarification à finaliser en Administration'}</span>
      </div>
    );
  }

  if (isReady) {
    return (
      <div className="pos-soft-alert pos-soft-alert--ok">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>Configuration complète · prêt pour le panier</span>
      </div>
    );
  }

  if (variant === 'alerts-only') return null;

  if (missing.length === 0) return null;

  return (
    <div className="pos-soft-missing">
      <div className="pos-soft-missing__head">
        <AlertCircle size={14} className="shrink-0 text-amber-600" />
        <span>
          {missing.length} champ{missing.length > 1 ? 's' : ''} restant
          {missing.length > 1 ? 's' : ''} · {completion.pct}%
        </span>
      </div>
      <div className="pos-soft-missing__chips">
        {missing.slice(0, 6).map((field) =>
          onFocusField ? (
            <button
              key={field.key}
              type="button"
              className="pos-soft-missing__chip"
              onClick={() => onFocusField(field.key)}
            >
              {field.label}
            </button>
          ) : (
            <span key={field.key} className="pos-soft-missing__chip">
              {field.label}
            </span>
          ),
        )}
        {missing.length > 6 && (
          <span className="pos-soft-missing__chip is-more">+{missing.length - 6}</span>
        )}
      </div>
    </div>
  );
}
