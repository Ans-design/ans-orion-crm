'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { resolveAdminLegacyContext } from '@/lib/administration/admin-legacy-context';
import { AdministrationHubLayout } from '@/components/administration/AdministrationHubLayout';
import '@/components/backoffice-v2/admin-backoffice.css';

type Props = { children: React.ReactNode };

function AdministrationSectionHubShellInner({ children }: Props) {
  const pathname = usePathname() ?? '';
  const ctx = resolveAdminLegacyContext(pathname);

  if (!ctx) {
    return <>{children}</>;
  }

  /**
   * CPS : AdminHeader + DOMAINES portent le chrome — flush sur tout le hub
   * pour aligner le titre / nav au même Y (pas seulement studio=prix).
   */
  const cpsFlush = pathname.includes('/administration/catalogue-prix-stock');

  return (
    <AdministrationHubLayout
      macro={ctx.macro}
      activeMicro={ctx.activeMicro}
      title={ctx.pageTitle}
      description={ctx.pageDescription}
      chrome={cpsFlush ? 'flush' : 'default'}
    >
      {children}
    </AdministrationHubLayout>
  );
}

/** Enveloppe Hub & Spoke — pages /administration/* sauf backoffice v2 */
export function AdministrationSectionHubShell({ children }: Props) {
  return (
    <Suspense fallback={<>{children}</>}>
      <AdministrationSectionHubShellInner>{children}</AdministrationSectionHubShellInner>
    </Suspense>
  );
}
