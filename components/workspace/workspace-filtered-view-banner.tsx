'use client';

import Link from 'next/link';
import { Filter } from 'lucide-react';

type Props = {
  /** Libellé du module complet (ex. « Commandes », « Factures ») */
  moduleLabel: string;
  href: string;
  className?: string;
};

/** Clarifie qu’un workspace n’est pas une base distincte — vue filtrée du module. */
export function WorkspaceFilteredViewBanner({ moduleLabel, href, className }: Props) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-[7px] border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground ${className ?? ''}`}
      role="status"
    >
      <Filter size={14} className="shrink-0 text-[var(--primary)]" aria-hidden />
      <span>
        Vue filtrée du module <strong className="text-foreground">{moduleLabel}</strong>
        {' — '}
        cockpit personnel, pas une base de données séparée.
      </span>
      <Link
        href={href}
        className="ml-auto font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
      >
        Ouvrir le module complet
      </Link>
    </div>
  );
}
