'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { EstimationTempsWorkspace } from '@/components/administration/estimation-temps/EstimationTempsWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

function Loading() {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Chargement Temps &amp; capacités…
    </div>
  );
}

function EstimationTempsContent() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager';
  return <EstimationTempsWorkspace canEdit={canEdit} />;
}

/** Administration → Temps & capacités (vitesses / finitions / délais). */
export default function AdministrationEstimationTempsPage() {
  return (
    <div className="ab2-shell w-full max-w-none mx-0 px-3 sm:px-4 py-3 sm:py-4 min-h-0 flex flex-col">
      <Suspense fallback={<Loading />}>
        <EstimationTempsContent />
      </Suspense>
    </div>
  );
}
