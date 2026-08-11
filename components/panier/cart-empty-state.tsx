'use client';

import Link from 'next/link';
import { ShoppingCart, Store, FileText } from 'lucide-react';
import { AppEmptyState, AppButton } from '@/components/ui/app-ui';

export function CartEmptyState() {
  return (
    <AppEmptyState
      icon={ShoppingCart}
      title="Votre panier est vide"
      description="Configurez vos articles depuis le catalogue POS — matières, finitions et délais inclus."
      action={(
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <AppButton asChild>
            <Link href="/pos">
              <Store size={16} strokeWidth={1.75} /> Retour au POS
            </Link>
          </AppButton>
          <AppButton asChild variant="outline">
            <Link href="/devis">
              <FileText size={16} strokeWidth={1.75} /> Voir les devis
            </Link>
          </AppButton>
        </div>
      )}
      className="py-16"
    />
  );
}
