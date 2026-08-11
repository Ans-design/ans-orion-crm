'use client';

import { useRouter } from 'next/navigation';
import { Clock, UserCheck, AlertTriangle, ArrowRight } from 'lucide-react';

type RhPointagePanelProps = {
  presentsToday?: number;
  retardsToday?: number;
  className?: string;
  /** Intégré dans une dashboard-chart-card — sans bordure double */
  embedded?: boolean;
};

export function RhPointagePanel({ presentsToday = 0, retardsToday = 0, className = '', embedded = false }: RhPointagePanelProps) {
  const router = useRouter();

  return (
    <div className={embedded ? className : `ans-card-premium p-4 ${className}`}>
      <div className={`flex items-center justify-between ${embedded ? 'dashboard-chart-card-header !mb-3' : 'mb-3'}`}>
        <h3 className={embedded ? 'dashboard-chart-card-title flex items-center gap-2' : 'font-semibold text-sm flex items-center gap-2'}>
          <Clock size={16} className="text-[var(--ans-red)]" />
          Pointage & retards
        </h3>
        <button
          type="button"
          onClick={() => router.push('/rh/employes')}
          className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1"
        >
          Gérer <ArrowRight size={12} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[7px] border border-border p-3 bg-accent/20">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <UserCheck size={14} /> Présents aujourd&apos;hui
          </div>
          <p className="text-2xl font-bold">{presentsToday}</p>
        </div>
        <div className={`rounded-[7px] border p-3 ${retardsToday > 0 ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-accent/20'}`}>
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <AlertTriangle size={14} className={retardsToday > 0 ? 'text-amber-600' : ''} /> Retards
          </div>
          <p className={`text-2xl font-bold ${retardsToday > 0 ? 'text-amber-600' : ''}`}>{retardsToday}</p>
        </div>
      </div>
    </div>
  );
}
