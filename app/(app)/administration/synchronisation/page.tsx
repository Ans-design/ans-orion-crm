'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { SyncUnifiedWorkspace } from '@/components/administration/sync/SyncUnifiedWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

function Loading() {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Chargement Synchronisation…
    </div>
  );
}

function SyncContent() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  return <SyncUnifiedWorkspace canEdit={canEdit} />;
}

/** Centre de synchronisation — diagnostics drift, resync catalogue, import DB */
export default function AdministrationSynchronisationPage() {
  return (
    <div className="ab2-shell max-w-[1800px] mx-auto px-4 py-4 min-h-0 flex flex-col">
      <Suspense fallback={<Loading />}>
        <SyncContent />
      </Suspense>
    </div>
  );
}
