import { redirect } from 'next/navigation';

/** Doublon de /machines — une seule liste atelier. */
export default function RhEquipementsRedirectPage() {
  redirect('/machines');
}
