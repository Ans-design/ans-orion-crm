import { redirect } from 'next/navigation';

/** Alias conservé — matières = studio Matières Administration. */
export default function ParametresMatieresRedirectPage() {
  redirect('/administration/catalogue-prix-stock?studio=matieres');
}
