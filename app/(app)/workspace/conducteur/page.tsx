'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData } from '@/lib/api-client';
import {
  Cpu, Play, Pause, AlertTriangle, Gauge, Thermometer, CheckCircle2,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { AppButton, AppResponsiveKpiGrid, AppStickyActionBar } from '@/components/ui/app-ui';
import { ANS } from '@/lib/ans-colors';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { PageHeader } from '@/components/layouts/page-header';

type MachineRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  utilization: number;
  category: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  running: { label: 'En production', color: 'text-emerald-500' },
  ok: { label: 'Prête', color: 'text-[var(--orion-yellow)]' },
  waiting: { label: 'En attente', color: 'text-[var(--text-secondary)]' },
  down: { label: 'Hors service', color: 'text-[var(--orion-red-vivid)]' },
  maintenance: { label: 'Maintenance', color: 'text-amber-500' },
};

/** Pupitre conducteur tactile — thème clair/sombre unifié */
export default function ConducteurWorkspacePage() {
  const router = useRouter();
  const { kpis, error, reload: reloadCockpit } = useCockpitStats('conducteur');
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [machinesError, setMachinesError] = useState(false);
  const [charge, setCharge] = useState<Record<string, number>>({});

  const loadMachines = useCallback(() => {
    setMachinesError(false);
    fetch('/api/machines', { credentials: 'include', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((d) => {
        const list = unwrapApiData<MachineRow[]>(d)
          .filter((m) => m.category === 'impression')
          .slice(0, 4);
        setMachines(list);
        setCharge((prev) => {
          const next = { ...prev };
          list.forEach((m) => { if (next[m.id] == null) next[m.id] = m.utilization ?? 50; });
          return next;
        });
      })
      .catch(() => setMachinesError(true));
  }, []);

  useEffect(() => { loadMachines(); }, [loadMachines]);

  const reload = () => {
    reloadCockpit();
    loadMachines();
  };

  const setMachineStatus = async (m: MachineRow, status: string, msg: string) => {
    try {
      const r = await fetch(`/api/machines/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        uxToast.success(`${m.code} — ${msg}`);
        reload();
      } else uxToast.error('Action impossible');
    } catch {
      uxToast.error('Erreur réseau');
    }
  };

  return (
    <div className="dashboard-full space-y-5 w-full">
      <PageHeader
        title="Pupitre de pilotage"
        kicker="Conducteur machine"
        compact
        icon={Cpu}
        meta="LIVE"
      />

      {(error || machinesError) && <CockpitErrorBanner onRetry={reload} />}

      <AppResponsiveKpiGrid columns={4} phoneMax={3}>
        <KpiCard label="En production" value={kpis.enProduction ?? 0} icon={Play} color={ANS.orange} onClick={() => router.push('/production')} />
        <KpiCard label="BAT en attente" value={kpis.batEnAttente ?? 0} icon={CheckCircle2} color={ANS.yellow} onClick={() => router.push('/bat')} />
        <KpiCard label="Tickets ouverts" value={kpis.ticketsOuverts ?? kpis.ticketsPlanning ?? 0} icon={AlertTriangle} color={ANS.red} onClick={() => router.push('/maintenance/tickets')} />
        <KpiCard
          label="Rendement cible"
          value={typeof kpis.rendementCibleFh === 'number' ? kpis.rendementCibleFh : 0}
          icon={Gauge}
          color={ANS.red}
          hint="f/h"
          emptyHint="NOT_APPLICABLE — objectif machine non versionné"
        />
      </AppResponsiveKpiGrid>

      <div className="orion-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
          <Cpu size={14} className="text-[var(--orion-red-vivid)]" /> Machines — charge & état
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {machines.map((m) => {
            const st = STATUS_LABEL[m.status] ?? STATUS_LABEL.waiting;
            const util = charge[m.id] ?? m.utilization ?? 0;
            const heat = util > 85 ? 'Surchauffe' : util > 50 ? 'Régulier' : 'Faible charge';
            return (
              <div key={m.id} className="rounded-md bg-[var(--cockpit-surface-muted)] border border-[var(--border-subtle)] p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{m.name}</p>
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">{m.code}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase ${st.color}`}>{st.label}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Gauge size={12} /> {util}% charge</span>
                  <span className="flex items-center gap-1"><Thermometer size={12} /> {heat}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={util}
                  onChange={(e) => setCharge((c) => ({ ...c, [m.id]: Number(e.target.value) }))}
                  className="w-full h-2 rounded-full appearance-none bg-[var(--orion-surface-muted)] accent-[var(--orion-red-vivid)]"
                  aria-label={`Charge ${m.name}`}
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMachineStatus(m, 'running', 'Impression démarrée')}
                    className="py-3 rounded-md ans-btn-primary text-[10px] font-bold flex flex-col items-center gap-1 active:scale-95 min-h-[56px]"
                  >
                    <Play size={16} /> Démarrer
                  </button>
                  <AppButton
                    type="button"
                    variant="outline"
                    onClick={() => setMachineStatus(m, 'waiting', 'Pause enregistrée')}
                    className="py-3 h-auto min-h-[56px] max-h-none text-[10px] font-bold flex flex-col items-center gap-1 active:scale-95 rounded-md"
                  >
                    <Pause size={16} /> Pause
                  </AppButton>
                  <button
                    type="button"
                    onClick={() => router.push(`/maintenance/tickets?machine=${encodeURIComponent(m.code)}`)}
                    className="py-3 rounded-md bg-[var(--orion-yellow)]/15 text-[var(--orion-yellow)] text-[10px] font-bold flex flex-col items-center gap-1 active:scale-95 min-h-[56px]"
                  >
                    <AlertTriangle size={16} /> Incident
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {machines.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">Aucune machine impression assignée.</p>
        )}
      </div>

      <AppStickyActionBar>
        <AppButton type="button" onClick={() => router.push('/production')}>
          <Play size={16} className="mr-1.5" /> Production
        </AppButton>
        <AppButton type="button" variant="outline" onClick={() => router.push('/maintenance/tickets')}>
          <AlertTriangle size={16} className="mr-1.5" /> Tickets
        </AppButton>
      </AppStickyActionBar>
    </div>
  );
}
