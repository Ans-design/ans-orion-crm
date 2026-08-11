import { redirect } from 'next/navigation';

/** Redirige vers ANS Talk — onglet Annonces équipe (fil historique conservé). */
export default function EquipeMessagesRedirectPage() {
  redirect('/messagerie?tab=annonces');
}
