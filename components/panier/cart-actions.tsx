'use client';

import { Plus, FileText, Trash2 } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';

export type CartCheckoutAction = 'devis' | 'clear';

interface CartActionsProps {
  onAddArticle: () => void;
  onAction: (action: CartCheckoutAction) => void;
  loadingAction: CartCheckoutAction | null;
  disabled?: boolean;
  hasItems: boolean;
  hasClient: boolean;
}

export function CartActions({
  onAddArticle,
  onAction,
  loadingAction,
  disabled,
  hasItems,
  hasClient,
}: CartActionsProps) {
  const busy = !!loadingAction || disabled;

  return (
    <div className="orion-card p-4 space-y-3">
      <h3 className="orion-text-card-title">Actions</h3>

      <div className="grid grid-cols-1 gap-3">
        <AppButton type="button" variant="outline" onClick={onAddArticle} disabled={busy || !hasClient} className="justify-start w-full">
          <Plus size={16} strokeWidth={1.75} /> Ajouter article
        </AppButton>
        <AppButton
          type="button"
          onClick={() => onAction('devis')}
          disabled={busy || !hasItems || !hasClient}
          className="justify-start w-full"
        >
          <FileText size={16} strokeWidth={1.75} />
          {loadingAction === 'devis' ? 'Création…' : 'Créer devis / proforma'}
        </AppButton>
        <p className="orion-text-meta leading-4 px-0.5">
          Panier → devis/proforma (reste en Devis si enregistré) → paiement → Commandes → Production.
        </p>
        <AppButton
          type="button"
          variant="destructive"
          onClick={() => onAction('clear')}
          disabled={busy || !hasItems}
          className="justify-start w-full"
        >
          <Trash2 size={16} strokeWidth={1.75} />
          {loadingAction === 'clear' ? 'Vidage…' : 'Vider panier'}
        </AppButton>
      </div>
    </div>
  );
}
