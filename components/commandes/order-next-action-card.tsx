'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/data/catalogue';
import type { NextAction } from '@/lib/flow/next-action';

type Props = {
  statut: string;
  nextAction: NextAction | null;
  reste?: number;
};

/** Carte action suivante compacte — une seule action principale. */
export function OrderNextActionCard({ nextAction, reste = 0 }: Props) {
  if (!nextAction) return null;

  return (
    <div className="orion-card bg-[color-mix(in_srgb,var(--ans-red-500)_8%,var(--orion-surface-soft))] px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <div className="min-w-0 flex-1 text-xs text-[var(--text-muted)]">
        <span className="font-semibold text-[var(--text-primary)]">{nextAction.label}</span>
        {nextAction.description && <span className="ml-1">— {nextAction.description}</span>}
        {reste > 0 && (
          <span className="ml-2 text-[var(--ans-orange-500)] font-mono text-[11px]">Reste {formatPrice(reste)} Ar</span>
        )}
      </div>
      <Link href={nextAction.href} className="ans-btn-primary inline-flex items-center justify-center gap-1 shrink-0 px-3 py-1.5 text-[11px] font-bold">
        {nextAction.label}
        <ArrowRight size={12} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
