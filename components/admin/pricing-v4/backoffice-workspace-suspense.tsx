'use client';

import { Suspense, type ComponentProps } from 'react';
import { BackofficeWorkspace } from '@/components/admin/pricing-v4/backoffice-workspace';

function BackofficeSkeleton() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8" aria-hidden>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-standard)] border-t-[var(--primary)]" />
    </div>
  );
}

export function BackofficeWorkspaceSuspense(props: ComponentProps<typeof BackofficeWorkspace>) {
  return (
    <Suspense fallback={<BackofficeSkeleton />}>
      <BackofficeWorkspace {...props} />
    </Suspense>
  );
}
