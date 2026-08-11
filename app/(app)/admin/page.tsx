import { redirect } from 'next/navigation';

/** Entrée canonique Administration = `/administration/*` (macros). */
export default function AdminLegacyRedirectPage() {
  redirect('/administration/vue-ensemble');
}
