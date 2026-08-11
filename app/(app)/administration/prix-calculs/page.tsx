import { redirect } from 'next/navigation';

/** Alias Prix & Calculs → Studio Prix & Calculs (tarifs par article). */
export default function PrixCalculsRedirectPage() {
  redirect('/administration/catalogue-prix-stock?studio=prix&tab=articles');
}
