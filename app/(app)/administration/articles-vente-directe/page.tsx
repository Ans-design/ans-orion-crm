'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { DirectSaleWorkspace } from '@/components/administration/direct-sale/DirectSaleWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

function Loading() {
  return <div className="p-8 text-center text-sm text-muted-foreground">Chargement articles vente directe…</div>;
}

function Content() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  return <DirectSaleWorkspace canEdit={canEdit} />;
}

export default function ArticlesVenteDirectePage() {
  return (
    <div className="ab2-shell max-w-[1600px] mx-auto px-4 py-4">
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </div>
  );
}
