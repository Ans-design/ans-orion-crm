import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Redirection légère — pas de requête Prisma au chargement racine. */
export default function Home() {
  redirect('/login');
}
