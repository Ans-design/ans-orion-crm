'use client';

import {
  ShoppingCart,
  FileText,
  RotateCcw,
  Send,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
} from 'lucide-react';

type CtaStatusTone = 'ready' | 'incomplete' | 'pending' | 'error';

type Props = {
  canAddToCart: boolean;
  canCreateQuoteDraft?: boolean;
  quoteDraftLoading?: boolean;
  disabledReason?: string | null;
  quoteDraftReason?: string | null;
  editMode?: boolean;
  /** Complétion pour le bandeau d’état Soft UI */
  completion?: { done: number; total: number; pct: number };
  pricePending?: boolean;
  addToCartLoading?: boolean;
  onAddToCart: () => void;
  onCreateDevis: () => void;
  onCreateQuoteDraft?: () => void;
  onReset: () => void;
  onCancelEdit?: () => void;
};

function resolveStatus(input: {
  canAddToCart: boolean;
  disabledReason?: string | null;
  completion?: { done: number; total: number; pct: number };
  pricePending?: boolean;
  canCreateQuoteDraft?: boolean;
  editMode?: boolean;
}): { tone: CtaStatusTone; title: string; detail: string } {
  const { canAddToCart, disabledReason, completion, pricePending, canCreateQuoteDraft, editMode } =
    input;
  const remaining = completion
    ? Math.max(0, completion.total - completion.done)
    : null;

  if (canAddToCart) {
    return {
      tone: 'ready',
      title: editMode ? 'Modifications prêtes' : 'Produit prêt à être ajouté',
      detail: editMode
        ? 'Enregistrez pour mettre à jour la ligne panier.'
        : 'Configuration complète — vous pouvez ajouter ce produit au panier.',
    };
  }

  if (pricePending || /prix|tarif|validation/i.test(disabledReason ?? '')) {
    return {
      tone: 'pending',
      title: 'Prix en attente de validation',
      detail:
        disabledReason ??
        (canCreateQuoteDraft
          ? 'Vous pouvez créer une demande de devis brouillon en attendant la validation tarifaire.'
          : 'Le tarif doit être défini avant l’ajout au panier.'),
    };
  }

  if (remaining != null && remaining > 0) {
    return {
      tone: 'incomplete',
      title: 'Configuration incomplète',
      detail: `Complétez la configuration produit pour activer l’ajout au panier · ${remaining} champ${remaining > 1 ? 's' : ''} obligatoire${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}.`,
    };
  }

  if (disabledReason) {
    const isHardError = /rupture|bloqu|stock|erreur|indisponible/i.test(disabledReason);
    return {
      tone: isHardError ? 'error' : 'incomplete',
      title: isHardError ? 'Ajout temporairement bloqué' : 'Action indisponible',
      detail: disabledReason,
    };
  }

  return {
    tone: 'incomplete',
    title: 'Configuration incomplète',
    detail: 'Complétez la configuration produit pour activer l’ajout au panier.',
  };
}

/** Zone CTA sticky Soft UI — hiérarchie primaire ANS / secondaire / tertiaire */
export function AddToCartActionBar({
  canAddToCart,
  canCreateQuoteDraft = false,
  quoteDraftLoading = false,
  disabledReason,
  quoteDraftReason,
  editMode = false,
  completion,
  pricePending = false,
  addToCartLoading = false,
  onAddToCart,
  onCreateDevis,
  onCreateQuoteDraft,
  onReset,
  onCancelEdit,
}: Props) {
  const status = resolveStatus({
    canAddToCart,
    disabledReason,
    completion,
    pricePending,
    canCreateQuoteDraft,
    editMode,
  });

  const StatusIcon =
    status.tone === 'ready'
      ? CheckCircle2
      : status.tone === 'pending'
        ? Clock3
        : AlertCircle;

  const primaryBusy = addToCartLoading || quoteDraftLoading;

  return (
    <div className="pos-cta-zone" role="group" aria-label="Actions configuration produit">
      {/* Bloc 1 — État de validation */}
      <div className={`pos-cta-status pos-cta-status--${status.tone}`} role="status">
        <span className="pos-cta-status__ico" aria-hidden>
          <StatusIcon size={16} strokeWidth={2.25} />
        </span>
        <div className="pos-cta-status__copy min-w-0">
          <p className="pos-cta-status__title">{status.title}</p>
          <p className="pos-cta-status__detail">{status.detail}</p>
        </div>
      </div>

      {/* Bloc 2 — CTA principal */}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={!canAddToCart || primaryBusy}
        aria-disabled={!canAddToCart || primaryBusy}
        aria-label={editMode ? 'Enregistrer et revenir au panier' : 'Ajouter au panier'}
        title={!canAddToCart ? (disabledReason ?? status.detail) : undefined}
        className="pos-cta-main"
      >
        {addToCartLoading ? (
          <Loader2 size={18} className="animate-spin shrink-0" aria-hidden />
        ) : (
          <ShoppingCart size={18} className="shrink-0" aria-hidden />
        )}
        <span className="pos-cta-main__label">
          {addToCartLoading
            ? 'Ajout en cours…'
            : editMode
              ? 'Enregistrer et revenir au panier'
              : 'Ajouter au panier'}
        </span>
        {!editMode && !addToCartLoading && (
          <ArrowRight size={18} className="pos-cta-main__arrow shrink-0" aria-hidden />
        )}
      </button>

      {/* Demande devis brouillon (si logique métier) */}
      {canCreateQuoteDraft && onCreateQuoteDraft && (
        <div className="pos-cta-draft">
          <button
            type="button"
            disabled={quoteDraftLoading}
            onClick={onCreateQuoteDraft}
            className="pos-cta-draft__btn"
            aria-label="Créer une demande de devis brouillon"
          >
            {quoteDraftLoading ? (
              <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
            ) : (
              <Send size={16} className="shrink-0" aria-hidden />
            )}
            <span>
              {quoteDraftLoading ? 'Création du devis…' : 'Créer demande de devis (brouillon)'}
            </span>
          </button>
          {(quoteDraftReason || status.tone === 'pending') && (
            <p className="pos-cta-draft__hint">
              {quoteDraftReason ??
                'Vous pouvez créer un devis brouillon même si le tarif final reste à valider.'}
            </p>
          )}
        </div>
      )}

      {/* Bloc 3 — CTA secondaire */}
      {!editMode && (
        <button
          type="button"
          onClick={onCreateDevis}
          disabled={!canAddToCart || primaryBusy}
          aria-disabled={!canAddToCart || primaryBusy}
          title={!canAddToCart ? (disabledReason ?? 'Prix et configuration requis pour un devis direct') : undefined}
          className="pos-cta-secondary"
          aria-label="Créer devis direct"
        >
          <FileText size={17} className="shrink-0" aria-hidden />
          <span>Créer devis direct</span>
        </button>
      )}

      {editMode && onCancelEdit && (
        <button type="button" onClick={onCancelEdit} className="pos-cta-secondary">
          Annuler
        </button>
      )}

      {/* Bloc 4 — Tertiaire */}
      {!editMode && (
        <button
          type="button"
          onClick={onReset}
          className="pos-cta-tertiary"
          aria-label="Réinitialiser cette configuration"
        >
          <RotateCcw size={14} className="shrink-0" aria-hidden />
          <span>Réinitialiser cette configuration</span>
        </button>
      )}
    </div>
  );
}
