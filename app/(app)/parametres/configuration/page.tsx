import { redirect } from 'next/navigation';

/** Alias conservé — hub config → Vue d'ensemble Admin. */
export default function ParametresConfigurationRedirectPage() {
  redirect('/administration/vue-ensemble');
}
