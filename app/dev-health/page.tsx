export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { isLocalAppEnv } from '@/lib/local-dev';
import packageJson from '../../package.json';

type CheckResult = {
  ok: boolean;
  label: string;
  detail?: string;
};

/**
 * Diagnostic local uniquement (SEC-02).
 * Hors APP_ENV=local / LOCAL_DEV : 404 sans requête DB.
 */
async function checkDatabase(): Promise<CheckResult> {
  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, label: 'Prisma / base de données', detail: 'connectée' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, label: 'Prisma / base de données', detail: msg.slice(0, 80) };
  }
}

export default async function DevHealthPage() {
  if (!isLocalAppEnv() && process.env.LOCAL_DEV !== 'true') {
    notFound();
  }

  const db = await checkDatabase();
  const host = process.env.HOST || '127.0.0.1';
  const port = process.env.PORT || '3020';
  const checks: CheckResult[] = [
    { ok: true, label: 'Application Next.js', detail: `v${packageJson.dependencies?.next ?? '?'}` },
    {
      ok: process.env.NODE_ENV === 'development' || process.env.LOCAL_DEV === 'true',
      label: 'Mode développement local',
      detail: process.env.NODE_ENV ?? 'unknown',
    },
    db,
    {
      ok: Boolean(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32),
      label: 'NEXTAUTH_SECRET',
      detail: process.env.NEXTAUTH_SECRET ? 'défini' : 'manquant ou trop court',
    },
    {
      ok: Boolean(process.env.DATABASE_URL?.trim()),
      label: 'DATABASE_URL',
      detail: process.env.DATABASE_URL ? 'défini' : 'non configuré',
    },
  ];

  const allOk = checks.every((c) => c.ok);

  return (
    <main className="min-h-screen bg-page p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="orion-surface-card-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnostic local</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">ANS ORION — /dev-health</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Réservé à l’environnement local. Aucun type de base ni secret exposé.
          </p>
        </header>

        <section
          className={`orion-surface-card-soft p-5 border-l-4 ${allOk ? 'border-l-[var(--success)]' : 'border-l-[var(--warning)]'}`}
        >
          <p className="text-sm font-semibold text-foreground">
            État global : {allOk ? 'OK' : 'Attention requise'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            URL locale : <code className="font-mono">http://{host}:{port}</code>
          </p>
        </section>

        <ul className="space-y-2">
          {checks.map((c) => (
            <li
              key={c.label}
              className="orion-surface-row flex items-start justify-between gap-3 p-3 orion-surface-row--alt"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                {c.detail ? <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p> : null}
              </div>
              <span className={`text-xs font-semibold ${c.ok ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                {c.ok ? 'OK' : 'KO'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
