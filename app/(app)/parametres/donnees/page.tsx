import { redirect } from 'next/navigation';

/** Alias conservé — données → Import / Export Admin. */
export default function ParametresDonneesRedirectPage() {
  redirect('/administration/import-export');
}
