import { redirect } from 'next/navigation';

/** Legacy Catalogue POS → domaines CPS (nav 5, Ultra-Prompt). */
export default function CataloguePosRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  const studio = typeof searchParams?.studio === 'string' ? searchParams.studio : '';
  const view = typeof searchParams?.view === 'string' ? searchParams.view : '';
  const action = typeof searchParams?.action === 'string' ? searchParams.action : '';
  const article = typeof searchParams?.article === 'string' ? searchParams.article : '';

  if (view === 'anomalies' || action === 'detect-duplicates') {
    params.set('tab', 'anomalies');
    params.set('studio', 'cockpit');
  } else if (view === 'corbeille') {
    params.set('tab', 'corbeille');
    params.set('studio', 'historique');
  } else if (studio === 'chips' && !article) {
    params.set('tab', 'chips');
    params.set('studio', 'prix');
  } else {
    params.set('tab', 'articles');
    params.set('studio', 'prix');
    if (article) {
      params.set('article', article);
      params.set('sheet', 'options');
    }
  }
  if (article && !params.has('article')) params.set('article', article);
  if (action && !params.has('action')) params.set('action', action);

  redirect(`/administration/catalogue-prix-stock?${params.toString()}`);
}
