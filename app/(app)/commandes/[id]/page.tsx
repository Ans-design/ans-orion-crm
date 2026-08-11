'use client';

import { Suspense } from 'react';
import { Commande360View } from '@/components/commandes/commande-360-view';

export default function CommandeDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement fiche commande…</div>}>
      <Commande360View id={params.id} />
    </Suspense>
  );
}
