'use client';

import { useRouter } from 'next/navigation';
import { Factory, ClipboardList, Cpu, Calendar, FileCheck, AlertTriangle, ArrowRight, ListTodo } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ANS, ANS_KPI_COLORS } from '@/lib/ans-colors';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { WorkspaceFilteredViewBanner } from '@/components/workspace/workspace-filtered-view-banner';
import { PageHeader } from '@/components/layouts/page-header';
import { PosteTachesBoard } from '@/components/workspace/poste-taches-board';

export default function ProductionWorkspacePage() {
  const router = useRouter();
  const { kpis, error, reload } = useCockpitStats('production');

  return (
    <div className="dashboard-full space-y-5 w-full">
      <PageHeader title="Mon poste production" kicker="Mon espace" compact icon={Factory} />
      <WorkspaceFilteredViewBanner moduleLabel="Production / GPAO" href="/production" />

      {error && <CockpitErrorBanner onRetry={reload} />}

      <PosteTachesBoard type="production" title="Mes tâches atelier du jour" />

      <div className="grid gap-3 kpi-grid">
        <KpiCard label="En production" value={kpis.enProduction || 0} icon={Factory} color={ANS.orange} onClick={() => router.push('/production')} />
        <KpiCard label="Commandes actives" value={kpis.cmdActives || 0} icon={ClipboardList} color={ANS_KPI_COLORS.tech} onClick={() => router.push('/commandes')} />
        <KpiCard label="Retards" value={kpis.cmdRetard || 0} icon={AlertTriangle} color={ANS.red} onClick={() => router.push('/commandes')} />
        <KpiCard label="BAT en attente" value={kpis.batEnAttente || 0} icon={FileCheck} color={ANS.yellow} onClick={() => router.push('/bat')} />
        <KpiCard label="Machines HS" value={kpis.machinesDown || 0} icon={Cpu} color={ANS_KPI_COLORS.finance} onClick={() => router.push('/machines')} />
        <KpiCard label="Stock critique" value={kpis.stockCritique || 0} icon={Factory} color={ANS.orange} onClick={() => router.push('/stock')} />
        <KpiCard label="Tâches ouvertes" value={kpis.tachesOuvertes ?? 0} icon={ListTodo} color={ANS.orange} onClick={() => router.push('/equipe/taches?type=production')} />
        <KpiCard label="Tâches bloquées" value={kpis.tachesBloquees ?? 0} icon={AlertTriangle} color={ANS.red} onClick={() => router.push('/equipe/taches?status=Bloquée')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Mes tâches atelier', href: '/equipe/taches?type=production', icon: ListTodo },
          { label: 'Kanban production', href: '/production', icon: Factory },
          { label: 'Planning atelier', href: '/planning', icon: Calendar },
          { label: 'Opérations temps réel', href: '/operations', icon: AlertTriangle },
          { label: 'Commandes', href: '/commandes', icon: ClipboardList },
          { label: 'Machines', href: '/machines', icon: Cpu },
        ].map((a) => (
          <button key={a.href} type="button" onClick={() => router.push(a.href)} className="ans-card-premium p-4 flex items-center gap-3 text-left">
            <a.icon size={20} className="text-[var(--ans-cyan)]" />
            <span className="text-sm font-semibold flex-1">{a.label}</span>
            <ArrowRight size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
