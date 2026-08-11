import { redirect } from 'next/navigation';

/** Legacy Stock & Matières → module unique Catalogue, Prix & Stock. */
export default function MatieresRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const view = typeof searchParams?.view === 'string' ? searchParams.view : '';
  const chip = typeof searchParams?.chip === 'string' ? searchParams.chip : '';
  const tab =
    view === 'corbeille' || view === 'historique'
      ? view
      : 'matieres';
  const qs = new URLSearchParams();
  qs.set('tab', tab);
  qs.set('studio', 'matieres');
  if (view) qs.set('view', view);
  if (chip) qs.set('chip', chip);
  redirect(`/administration/catalogue-prix-stock?${qs.toString()}`);
}
