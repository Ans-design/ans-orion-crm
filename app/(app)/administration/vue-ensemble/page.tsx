'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { OverviewUnifiedWorkspace } from '@/components/administration/overview/OverviewUnifiedWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

function Loading() {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Chargement Vue d&apos;ensemble…
    </div>
  );
}

function OverviewContent() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager';
  return <OverviewUnifiedWorkspace canEdit={canEdit} />;
}

/**
 * Administration > Vue d'ensemble —
 * supervision Admin + cockpit Catalogue Prix & Stock fusionnés (pas de remplacement).
 */
export default function AdministrationVueEnsemblePage() {
  return (
    <div className="ab2-shell w-full max-w-none mx-0 px-4 py-4 min-h-0 flex flex-col">
      <Suspense fallback={<Loading />}>
        <OverviewContent />
      </Suspense>
    </div>
  );
}
