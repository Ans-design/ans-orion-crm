'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { RoleWelcome } from '@/lib/cockpit/role-welcome';

type Props = {
  welcome: RoleWelcome;
};

/** Bannière accueil — tokens clair/sombre. */
export function RoleWelcomeBanner({ welcome }: Props) {
  return (
    <section className="orion-welcome-saas relative overflow-hidden rounded-[7px] border-0 bg-[var(--bg-card)] p-5 sm:p-6 shadow-[var(--shadow-card)] dark:border dark:border-[var(--border-soft)] dark:shadow-none">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-90"
        style={{ background: 'radial-gradient(circle, rgba(255,23,77,0.12) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="text-meta font-semibold uppercase tracking-[0.08em] text-[var(--text-dim,#94A3B8)]">
            Cockpit ANS ORION
          </p>
          <h2 className="mt-1 orion-text-section font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2">
            <Sparkles size={20} className="text-[var(--accent-gold,#FACC15)] shrink-0" aria-hidden />
            <span>{welcome.greeting}</span>
          </h2>
          <p className="mt-2 text-body leading-relaxed text-[var(--text-muted)]">{welcome.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {welcome.shortcuts.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              className={
                i === 0
                  ? 'inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-[7px] bg-primary text-white shadow-[0_4px_14px_rgba(255,23,77,0.28)] hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]'
                  : 'inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-[7px] bg-[var(--bg-hover,#F4F7FB)] text-[var(--text-main)] border border-[var(--border-normal,#E2E8F0)] hover:bg-[var(--bg-card)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]'
              }
            >
              {s.label}
              {i === 0 ? <ArrowRight size={14} aria-hidden /> : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
