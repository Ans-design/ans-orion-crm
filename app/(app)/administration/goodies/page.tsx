'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { GoodiesAdminWorkspace } from '@/components/administration/goodies/GoodiesAdminWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

export default function GoodiesAdminPage() {
  return (
    <div className="ab2-shell max-w-[1600px] mx-auto px-4 py-4">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement…</div>}>
        <Content />
      </Suspense>
    </div>
  );
}

function Content() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  return <GoodiesAdminWorkspace canEdit={canEdit} />;
}
