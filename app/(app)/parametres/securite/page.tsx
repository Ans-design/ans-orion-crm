import { redirect } from 'next/navigation';

/** Alias conservé — sécurité → Rôles & permissions Admin. */
export default function ParametresSecuriteRedirectPage() {
  redirect('/administration/roles-permissions');
}
