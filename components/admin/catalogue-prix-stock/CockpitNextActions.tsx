'use client';

import { Boxes, Calculator, FileSpreadsheet, Package, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS: {
  studio: string;
  tab: string;
  view?: string;
  label: string;
  hint: string;
  icon: typeof Package;
}[] = [
  {
    studio: 'articles',
    tab: 'articles',
    label: 'Activer un produit',
    hint: 'Fiche + disponibilité POS',
    icon: Package,
  },
  {
    studio: 'matieres',
    tab: 'matieres',
    view: 'couts',
    label: 'Compléter un coût',
    hint: 'Matières · coûts & prix',
    icon: Boxes,
  },
  {
    studio: 'prix',
    tab: 'overview',
    label: 'Corriger un tarif',
    hint: 'Studio Prix & Calculs',
    icon: Calculator,
  },
  {
    studio: 'finitions',
    tab: 'finitions',
    label: 'Finitions & façonnage',
    hint: 'Opérations de production',
    icon: Scissors,
  },
  {
    studio: 'excel',
    tab: 'anomalies',
    label: 'Diagnostiquer POS',
    hint: 'Parité Admin ↔ POS',
    icon: FileSpreadsheet,
  },
];

type Props = {
  onOpen: (studio: string, tab: string, view?: string) => void;
  className?: string;
};

/**
 * Actions utiles cockpit — non monté dans CockpitStudio (doublon DOMAINES).
 * Conservé pour éventuel réemploi / tests.
 */
export function CockpitNextActions({ onOpen, className }: Props) {
  return (
    <section className={cn('space-y-2', className)} aria-label="Actions utiles">
      <h3 className="m-0 text-sm font-bold text-[var(--cps-title,#0f172a)]">Prochaines actions utiles</h3>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={`${a.studio}-${a.tab}-${a.view ?? ''}`}
              type="button"
              onClick={() => onOpen(a.studio, a.tab, a.view)}
              className="rounded-[7px] border border-[var(--cps-border,#e2e8f0)] bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:shadow-sm"
            >
              <Icon className="mb-1.5 h-4 w-4 text-slate-400" aria-hidden />
              <span className="block text-xs font-semibold text-slate-900">{a.label}</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">{a.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
