import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accès non autorisé | ANS ORION',
  description: 'Vous n’avez pas les droits nécessaires pour accéder à cette page.',
};

export default function NonAutorisePage() {
  return (
    <main className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-[7px] border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-[7px] border border-border bg-muted">
          <span className="text-xl" aria-hidden>
            🔒
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Accès non autorisé</h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à ce module.
          Contactez un administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Retour au tableau de bord
          </Link>

          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
          >
            Changer de compte
          </Link>
        </div>
      </section>
    </main>
  );
}
