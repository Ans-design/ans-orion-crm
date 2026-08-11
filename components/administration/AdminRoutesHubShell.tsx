'use client';

import { usePathname } from 'next/navigation';
import { resolveAdminLegacyContext } from '@/lib/administration/admin-legacy-context';
import { AdministrationHubLayout } from '@/components/administration/AdministrationHubLayout';
import '@/components/backoffice-v2/admin-backoffice.css';

type Props = { children: React.ReactNode };

/** Enveloppe Hub & Spoke — pages /admin/permissions, /admin/annexes, etc. */
export function AdminRoutesHubShell({ children }: Props) {
  const pathname = usePathname() ?? '';
  const ctx = resolveAdminLegacyContext(pathname);

  if (!ctx) {
    return <>{children}</>;
  }

  return (
    <AdministrationHubLayout
      macro={ctx.macro}
      activeMicro={ctx.activeMicro}
      title={ctx.pageTitle}
      description={ctx.pageDescription}
    >
      {children}
    </AdministrationHubLayout>
  );
}
