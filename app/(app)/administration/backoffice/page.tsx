'use client';

import { Suspense } from 'react';
import { AdminBackofficeShell } from '@/components/backoffice-v2/AdminBackofficeShell';

function Loading() {
  return (
    <div className="ab2-shell p-8 text-center text-sm opacity-70">
      Chargement Administration Backoffice…
    </div>
  );
}

export default function AdministrationBackofficePage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminBackofficeShell />
    </Suspense>
  );
}
