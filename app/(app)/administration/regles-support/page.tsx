'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PricingRulesWorkspace } from '@/components/administration/pricing-rules/PricingRulesWorkspace';
import '@/components/backoffice-v2/admin-backoffice.css';

/** Alias legacy — même workspace, onglet règles support. */
export default function ReglesSupportPage() {
  return (
    <div className="ab2-shell max-w-[1600px] mx-auto px-4 py-4">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement…</div>}>
        <Content />
      </Suspense>
    </div>
  );
}

function Content() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';

  useEffect(() => {
    // Deep-link clair vers formats (faces = 2e onglet du même hub)
    router.replace('/administration/parametres-formats-papier');
  }, [router]);

  return <PricingRulesWorkspace canEdit={canEdit} />;
}
