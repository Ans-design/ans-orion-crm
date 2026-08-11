'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Monitor, Smartphone, Moon, Sun, ExternalLink } from 'lucide-react';
import { LateArrivalPreview } from '@/components/dev-preview/late-arrival-preview';

type LoginScenario = 'default' | 'session_expired' | 'panier';

const LOGIN_SCENARIOS: { id: LoginScenario; label: string; path: string }[] = [
  { id: 'default', label: 'Connexion standard', path: '/login' },
  { id: 'session_expired', label: 'Session expirée', path: '/login?reason=session_expired' },
  { id: 'panier', label: 'Redirect panier', path: '/login?redirect=%2Fpanier' },
];

export function AuthUiPreview() {
  const [loginScenario, setLoginScenario] = useState<LoginScenario>('default');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [showLateModal, setShowLateModal] = useState(true);

  const loginPath = LOGIN_SCENARIOS.find((s) => s.id === loginScenario)?.path ?? '/login';
  const loginSrc = `${loginPath}${loginPath.includes('?') ? '&' : '?'}_preview=1`;

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-mono text-[var(--orion-yellow)]">ANS ORION — Aperçus UI auth</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Login & déclaration de retard</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Prévisualisation locale des écrans refondus — sans gate RH réelle.
          Login réel : comptes injectés via <code className="orion-text-code">.env.local</code> (DEMO_* / LOCAL_ADMIN_*).
        </p>
        <Link href="/dev-preview" className="inline-flex text-sm text-[var(--orion-red)] hover:underline">
          ← Retour au hub local
        </Link>
      </header>

      {/* ── Login ── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Page login</h2>
          <div className="flex flex-wrap gap-2">
            {LOGIN_SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setLoginScenario(s.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  loginScenario === s.id
                    ? 'ans-btn-primary border-transparent text-primary-foreground'
                    : 'border-border hover:bg-accent'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
              viewport === 'desktop' ? 'border-[var(--orion-red)] bg-[var(--bg-selected-soft)]' : 'border-border'
            }`}
          >
            <Monitor size={14} /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
              viewport === 'mobile' ? 'border-[var(--orion-red)] bg-[var(--bg-selected-soft)]' : 'border-border'
            }`}
          >
            <Smartphone size={14} /> Mobile
          </button>
          <a
            href={loginPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent ml-auto"
          >
            Ouvrir plein écran <ExternalLink size={12} />
          </a>
        </div>

        <div
          className={`mx-auto overflow-hidden rounded-[7px] border border-border shadow-lg bg-[#07111F] transition-all ${
            viewport === 'mobile' ? 'max-w-[390px]' : 'w-full'
          }`}
        >
          <iframe
            title={`Aperçu login — ${loginScenario}`}
            src={loginSrc}
            className="w-full border-0"
            style={{ height: viewport === 'mobile' ? 720 : 680 }}
          />
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-3">
          <Sun size={12} aria-hidden /> Mode clair / <Moon size={12} aria-hidden /> sombre : basculer dans Paramètres → Apparence puis recharger l&apos;iframe.
        </p>
      </section>

      {/* ── Retard RH ── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Déclaration de retard RH</h2>
          <button
            type="button"
            onClick={() => setShowLateModal((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-accent"
          >
            {showLateModal ? 'Masquer la modale' : 'Afficher la modale'}
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Données mock — employé fictif, +23 min de retard. Validation simulée (pas d&apos;appel API).
        </p>

        {showLateModal ? (
          <div className="relative rounded-[7px] border border-border overflow-hidden min-h-[520px] bg-[var(--bg-page)]">
            <LateArrivalPreview />
          </div>
        ) : (
          <div className="rounded-[7px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Modale masquée — cliquez « Afficher la modale »
          </div>
        )}
      </section>

      <section className="rounded-[7px] border border-dashed border-border p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">URLs directes</p>
        <p><code className="text-[11px]">/login</code> · <code className="text-[11px]">/login?reason=session_expired</code> · <code className="text-[11px]">/dev-preview/auth-ui</code></p>
        <p className="pt-1">Gate RH réelle : visible après connexion employé en retard (API <code className="text-[11px]">/api/rh/late-arrival</code>).</p>
      </section>
    </main>
  );
}
