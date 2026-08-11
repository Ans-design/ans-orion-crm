import { redirect } from 'next/navigation';

/** Legacy Base Prix / Matières / Stock → module unique Catalogue, Prix & Stock. */
export default function PrixMatieresStockRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const tab = typeof searchParams?.tab === 'string' ? searchParams.tab : 'vue';
  const view = typeof searchParams?.view === 'string' ? searchParams.view : '';
  const params = new URLSearchParams();
  params.set('tab', tab === 'prix-base' ? 'matieres' : tab);
  if (view) params.set('view', view);
  redirect(`/administration/catalogue-prix-stock?${params.toString()}`);
}
