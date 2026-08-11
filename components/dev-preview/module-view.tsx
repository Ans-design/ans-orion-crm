'use client';

import Link from 'next/link';
import { getMockDataset } from '@/src/mock';
import { mockTasks, tasksByStatus, type TaskStatus } from '@/src/mock/tasks';
import {
  DEV_PREVIEW_MODULES,
  STATUS_COLORS,
  STATUS_LABELS,
  type DevPreviewModule,
} from '@/lib/dev-preview/registry';
import { LOCAL_DEV_BANNER } from '@/lib/local-dev';

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function ModuleCard({ mod }: { mod: DevPreviewModule }) {
  const taskStatus = mod.taskStatus ?? 'todo';
  return (
    <article className="rounded-[7px] border border-border bg-card p-4 flex flex-col gap-3 hover:border-[var(--orion-red)]/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">{mod.title}</h2>
          <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
        </div>
        {mod.taskStatus ? <StatusBadge status={taskStatus} /> : null}
      </div>
      <div className="flex flex-wrap gap-2 mt-auto">
        {mod.slug !== 'auth-ui' && (
          <Link
            href={`/dev-preview/${mod.slug}`}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent"
          >
            Données mock
          </Link>
        )}
        <Link
          href={mod.slug === 'auth-ui' ? '/dev-preview/auth-ui' : mod.route}
          className="text-xs font-medium px-3 py-1.5 rounded-lg ans-btn-primary text-primary-foreground"
        >
          {mod.slug === 'auth-ui' ? 'Aperçu UI →' : 'Aperçu local →'}
        </Link>
      </div>
    </article>
  );
}

export function DevPreviewModuleView({ module: mod }: { module: DevPreviewModule }) {
  const data = getMockDataset(mod.mockKey);
  const relatedTasks = mockTasks.filter((t) => t.module === mod.slug);

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <p className="text-xs text-muted-foreground mb-1">{LOCAL_DEV_BANNER}</p>
        <h1 className="text-2xl font-bold">{mod.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={mod.slug === 'auth-ui' ? '/dev-preview/auth-ui' : mod.route}
          className="ans-btn-primary inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Aperçu local — {mod.slug === 'auth-ui' ? '/dev-preview/auth-ui' : mod.route}
        </Link>
        <Link href="/dev-preview" className="inline-flex items-center px-4 py-2 rounded-lg text-sm border border-border hover:bg-accent">
          Retour au hub
        </Link>
      </div>

      {relatedTasks.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold mb-2">Tâches liées</h2>
          <ul className="space-y-2">
            {relatedTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm border border-border rounded-lg px-3 py-2">
                <span>{t.title}</span>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold mb-2">Données mock (`{mod.mockKey}`)</h2>
        <pre className="text-xs overflow-auto max-h-[420px] rounded-[7px] border border-border bg-[var(--orion-surface-soft)] p-4">
          {JSON.stringify(data, null, 2)}
        </pre>
      </section>
    </main>
  );
}

export function DevPreviewHub() {
  const done = tasksByStatus('done');
  const inProgress = tasksByStatus('in_progress');
  const fixes = tasksByStatus('fix');
  const todo = tasksByStatus('todo');

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-mono text-[var(--orion-yellow)]">ANS ORION — Local Preview</p>
        <h1 className="text-3xl font-bold tracking-tight">Hub développement local</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Testez les modules sur <strong>http://127.0.0.1:3020</strong> (pas Hostinger).
          {' '}{LOCAL_DEV_BANNER}
        </p>
        <div className="rounded-[7px] border border-[var(--orion-red)]/25 bg-[color-mix(in_srgb,var(--orion-red)_6%,transparent)] p-3 text-xs space-y-1 max-w-2xl">
          <p className="font-semibold text-foreground">Correction 2026-07-30 — aperçu local</p>
          <p>P0–G2 · Variables + Sync au menu · stock insuffisant seul → En attente · build OK</p>
          <p className="font-mono text-muted-foreground">
            Login : utiliser les comptes seedés via variables d’environnement
            (<code className="text-[10px]">SEED_ADMIN_*</code> / <code className="text-[10px]">SEED_DEMO_*</code>) —
            aucun mot de passe n’est affiché ici.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/administration/apercus" className="underline text-[var(--orion-red)]">Aperçus POS</Link>
            <Link href="/pos" className="underline text-[var(--orion-red)]">POS</Link>
            <Link href="/login" className="underline text-[var(--orion-red)]">Login</Link>
            <Link href="/administration/vue-ensemble" className="underline text-[var(--orion-red)]">Administration</Link>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Terminés', count: done.length, status: 'done' as TaskStatus },
          { label: 'En cours', count: inProgress.length, status: 'in_progress' as TaskStatus },
          { label: 'À corriger', count: fixes.length, status: 'fix' as TaskStatus },
          { label: 'À faire', count: todo.length, status: 'todo' as TaskStatus },
        ].map((s) => (
          <div key={s.label} className={`rounded-[7px] border p-4 ${STATUS_COLORS[s.status]}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs font-medium">{s.label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Modules</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEV_PREVIEW_MODULES.map((m) => (
            <ModuleCard key={m.slug} mod={m} />
          ))}
        </div>
      </section>

      <section className="rounded-[7px] border border-dashed border-border p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Commandes utiles</p>
        <code className="block text-xs mt-2">npm run dev</code>
        <code className="block text-xs mt-1">npm run test:local</code>
        <code className="block text-xs mt-1">npm run preview:local</code>
      </section>
    </main>
  );
}
