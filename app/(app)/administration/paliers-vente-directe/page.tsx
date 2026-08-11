'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { DirectSaleTiersWorkspace } from '@/components/administration/direct-sale/DirectSaleTiersWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

export default function PaliersVenteDirectePage() {
  return (
    <div className="ab2-shell max-w-[1200px] mx-auto px-4 py-4">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement…</div>}>
        <TiersContent />
      </Suspense>
    </div>
  );
}

function TiersContent() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  return <DirectSaleTiersWorkspace canEdit={canEdit} />;
}
