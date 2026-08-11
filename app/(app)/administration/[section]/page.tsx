import { redirect } from 'next/navigation';
import { resolveBackofficeRedirect } from '@/lib/administration/backoffice-redirects';
import AdministrationLegacySectionPage from './legacy-client';

type Props = {
  params: { section: string };
};

export default function AdministrationSectionPage({ params }: Props) {
  const target = resolveBackofficeRedirect(params.section);
  if (target) redirect(target);
  return <AdministrationLegacySectionPage params={params} />;
}
