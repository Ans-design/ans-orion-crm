'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ADMIN_CONTROL_PRICING_REDIRECTS } from '@/components/admin/admin-control-constants';
import { resolvePricingAdminTab } from '@/lib/pricing/pricing-admin-ui';

function AdminControlRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get('tab');
    const article = searchParams.get('article');
    const mapped = t && ADMIN_CONTROL_PRICING_REDIRECTS[t]
      ? ADMIN_CONTROL_PRICING_REDIRECTS[t]
      : `/admin/pricing?tab=${resolvePricingAdminTab(t)}${article ? `&article=${article}` : ''}`;
    router.replace(mapped);
  }, [router, searchParams]);

  return (
    <div className="orion-page py-20 text-center text-muted-foreground">
      Redirection vers le Backoffice unifié…
    </div>
  );
}

export default function AdminControlRedirectPage() {
  return (
    <Suspense fallback={<div className="orion-page py-20 text-center text-muted-foreground">Chargement…</div>}>
      <AdminControlRedirectInner />
    </Suspense>
  );
}
