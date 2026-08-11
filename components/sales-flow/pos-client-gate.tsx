'use client';

import { ShoppingBag } from 'lucide-react';
import { AppEmptyState } from '@/components/ui/app-ui';

type Props = {
  onStartOrder: () => void;
};

export function PosClientGate({ onStartOrder }: Props) {
  return (
    <AppEmptyState
      icon={ShoppingBag}
      title="Commencer une nouvelle commande"
      description="Sélectionnez d'abord un client existant dans le CRM pour accéder au Catalogue POS et configurer les articles."
      action={
        <button
          type="button"
          onClick={onStartOrder}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[7px] bg-primary text-primary-foreground text-sm font-semibold mt-2 shadow-md"
        >
          <ShoppingBag size={16} /> Commencer une nouvelle commande
        </button>
      }
    />
  );
}
