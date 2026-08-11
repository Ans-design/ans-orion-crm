'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { ProductionFluxUnifiedWorkspace } from '@/components/administration/production-flux/ProductionFluxUnifiedWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

function Loading() {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Chargement Production &amp; Flux…
    </div>
  );
}

function ProductionFluxContent() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager';
  return <ProductionFluxUnifiedWorkspace canEdit={canEdit} />;
}

/** Page unique Administration > Production & Flux — workflow, transitions, règles et sync unifiés. */
export default function AdministrationProductionFluxPage() {
  return (
    <div className="ab2-shell w-full max-w-none mx-0 px-3 sm:px-4 py-3 sm:py-4 min-h-0 flex flex-col">
      <Suspense fallback={<Loading />}>
        <ProductionFluxContent />
      </Suspense>
    </div>
  );
}
