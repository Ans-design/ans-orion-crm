'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Cpu, AlertTriangle, ArrowRight, ListTodo, Calendar, CheckSquare } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { AppButton } from '@/components/ui/app-ui';
import { ANS, ANS_KPI_COLORS } from '@/lib/ans-colors';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { PageHeader } from '@/components/layouts/page-header';

const DAILY_CHECKLIST = [
  'Vérifier niveaux encre machines principales',
  'Contrôler température atelier',
  'Tester alignement massicot Polar',
  'Vérifier pression HP Indigo',
  'Nettoyer têtes impression Konica',
  'Contrôle bande Heidelberg SM102',
];

function checklistStorageKey() {
  const day = new Date().toISOString().slice(0, 10);
  return `orion-maintenance-checklist:${day}`;
}

export default function MaintenanceWorkspacePage() {
  const router = useRouter();
  const { kpis, error, reload } = useCockpitStats('technicien');
  const [checks, setChecks] = useState<boolean[]>(() => DAILY_CHECKLIST.map(() => false));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(checklistStorageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw) as boolean[];
      if (Array.isArray(parsed) && parsed.length === DAILY_CHECKLIST.length) {
        setChecks(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCheck = (index: number) => {
    setChecks((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      try {
        localStorage.setItem(checklistStorageKey(), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const machinesDown = kpis.machinesDown || 0;

  return (
    <div className="dashboard-full space-y-5 w-full">
      <PageHeader title="Maintenance — Mon espace" kicker="Mon espace" compact icon={Wrench} />

      {error && <CockpitErrorBanner onRetry={reload} />}

      {machinesDown > 0 && (
        <div className="rounded-[7px] border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4">
          <div className="text-sm font-bold text-red-600">🚨 {machinesDown} machine(s) en panne</div>
          <p className="text-xs text-muted-foreground mt-1">Intervention nécessaire — voir signalements</p>
        </div>
      )}

      <div className="grid gap-3 kpi-grid">
        <KpiCard label="Machines en panne" value={machinesDown} icon={AlertTriangle} color={ANS.red} onClick={() => router.push('/machines')} />
        <KpiCard label="Interventions à faire" value={kpis.tachesOuvertes ?? 0} icon={Wrench} color={ANS_KPI_COLORS.tech} onClick={() => router.push('/equipe/taches')} />
        <KpiCard label="Tâches bloquées" value={kpis.tachesBloquees ?? 0} icon={ListTodo} color={ANS.orange} onClick={() => router.push('/equipe/taches?status=Bloquée')} />
        <KpiCard label="Stock pièces" value={kpis.stockCritique || 0} icon={Cpu} color={ANS.yellow} onClick={() => router.push('/stock')} />
        <KpiCard label="Tickets ouverts" value={kpis.ticketsOuverts ?? 0} icon={Wrench} color={ANS_KPI_COLORS.finance} onClick={() => router.push('/maintenance/tickets')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ans-card-premium p-5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Wrench size={16} /> Signalements à traiter</h2>
          <p className="text-xs text-muted-foreground mb-3">Machines et anomalies — parc machines complet</p>
          <AppButton type="button" size="sm" className="w-full" onClick={() => router.push('/maintenance/tickets')}>
            Voir tickets maintenance →
          </AppButton>
        </div>
        <div className="ans-card-premium p-5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><CheckSquare size={16} /> Checklist journalière</h2>
          <div className="space-y-2">
            {DAILY_CHECKLIST.map((item, i) => (
              <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={checks[i]} onChange={() => toggleCheck(i)} className="accent-[var(--primary)]" />
                <span className={checks[i] ? 'line-through text-muted-foreground' : ''}>{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Machines', href: '/machines', icon: Cpu },
          { label: 'Planning atelier', href: '/planning', icon: Calendar },
          { label: 'Mes tâches', href: '/equipe/taches', icon: ListTodo },
          { label: 'Mon profil', href: '/rh/mon-profil', icon: Wrench },
        ].map((a) => (
          <button key={a.href} type="button" onClick={() => router.push(a.href)} className="ans-card-premium p-4 flex items-center gap-3 text-left">
            <a.icon size={20} className="text-primary" />
            <span className="text-sm font-semibold flex-1">{a.label}</span>
            <ArrowRight size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
