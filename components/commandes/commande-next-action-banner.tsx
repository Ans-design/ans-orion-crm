'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { NextAction } from '@/lib/flow/next-action';

type Props = {
  commandeNumero: string;
  statut: string;
  nextAction: NextAction | null;
  reste?: number;
  className?: string;
};

/** Bandeau action suivante — hub commande ERP. */
export function CommandeNextActionBanner({ commandeNumero, statut, nextAction, reste = 0, className = '' }: Props) {
  if (!nextAction) return null;

  return (
    <div
      className={`rounded-[7px] border border-primary/25 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Commande {commandeNumero} · {statut}
        </p>
        <p className="text-sm font-semibold text-foreground mt-0.5">Prochaine action : {nextAction.label}</p>
        {nextAction.description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{nextAction.description}</p>
        ) : reste > 0 ? (
          <p className="text-xs text-amber-600 mt-0.5">Reste à encaisser : {Math.round(reste).toLocaleString('fr-FR')} Ar</p>
        ) : null}
      </div>
      <Link
        href={nextAction.href}
        className={
          /facture/i.test(nextAction.label)
            ? 'inline-flex items-center justify-center gap-1.5 shrink-0 h-8 min-h-8 max-h-8 px-4 rounded-[7px] text-[11px] font-semibold border bg-[#7b1fa2]/10 text-[#7b1fa2] border-[#7b1fa2]/30 hover:bg-[#7b1fa2]/20'
            : 'inline-flex items-center justify-center gap-1.5 shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90'
        }
      >
        {nextAction.label}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
