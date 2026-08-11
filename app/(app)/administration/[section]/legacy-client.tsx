'use client';

import { BackofficeWorkspaceSuspense } from '@/components/admin/pricing-v4/backoffice-workspace-suspense';
import '@/components/backoffice-v2/admin-backoffice.css';

type Props = {
  params: { section: string };
};

/** Workspace legacy — panneaux spécialisés (layout Hub via administration/layout.tsx). */
export default function AdministrationLegacySectionPage({ params }: Props) {
  const { section } = params;
  return <BackofficeWorkspaceSuspense section={section} navMode="administration-path" />;
}
