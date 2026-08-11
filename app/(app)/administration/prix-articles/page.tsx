'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { PrixArticlesWorkspace } from '@/components/administration/prix-articles/PrixArticlesWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

export default function PrixArticlesPage() {
  return (
    <div className="w-full max-w-none min-w-0">
      <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-muted,#94a3b8)]">Chargement…</div>}>
        <Content />
      </Suspense>
    </div>
  );
}

function Content() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  return <PrixArticlesWorkspace canEdit={canEdit} />;
}
