import { redirect } from 'next/navigation';

/** Alias conservé — règles métier = Formules onglet 03. */
export default function ParametresReglesRedirectPage() {
  redirect('/administration/catalogue-prix-stock?studio=calculs&tab=regles&fm=rules');
}
