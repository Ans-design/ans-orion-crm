import { redirect } from 'next/navigation';

export default function StudioFichiersRedirect() {
  redirect('/studio?tab=fichiers');
}
