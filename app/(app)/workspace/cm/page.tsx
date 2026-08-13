'use client';

import { useRouter } from 'next/navigation';
import { Smartphone, ClipboardList, Users, FileCheck, ArrowRight, ListTodo, Bell, Megaphone } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ANS, ANS_KPI_COLORS } from '@/lib/ans-colors';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { PageHeader } from '@/components/layouts/page-header';
import { PosteTachesBoard } from '@/components/workspace/poste-taches-board';

export default function CmWorkspacePage() {
  const router = useRouter();
  const { kpis, error, reload } = useCockpitStats('cm');

  return (
    <div className="dashboard-full space-y-5 w-full">
      <PageHeader title="Espace CM" kicker="Community Manager" compact icon={Smartphone} />

      {error && <CockpitErrorBanner onRetry={reload} />}

      <PosteTachesBoard title="Mes tâches du jour (planifiées)" />

      <div className="grid gap-3 kpi-grid">
        <KpiCard label="Commandes actives" value={kpis.cmdActives || 0} icon={ClipboardList} color="#7b1fa2" onClick={() => router.push('/commandes')} />
        <KpiCard label="Clients" value={kpis.clients || 0} icon={Users} color={ANS_KPI_COLORS.tech} onClick={() => router.push('/clients')} />
        <KpiCard label="BAT en attente" value={kpis.batEnAttente || 0} icon={FileCheck} color={ANS.yellow} onClick={() => router.push('/commandes')} />
        <KpiCard label="Tâches en cours" value={kpis.tachesOuvertes ?? 0} icon={ListTodo} color={ANS_KPI_COLORS.success} onClick={() => router.push('/equipe/taches')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ans-card-premium p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-sm">📦 Commandes en cours</h2>
            <button type="button" className="btn btn-r btn-sm" onClick={() => router.push('/commandes?new=1')}>⊕ Nouvelle</button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Enregistrez et suivez les commandes clients</p>
          <button type="button" onClick={() => router.push('/commandes')} className="btn btn-out btn-sm w-full">Voir toutes les commandes →</button>
        </div>
        <div className="ans-card-premium p-5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Megaphone size={16} /> Campagnes & publications
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Suivez et planifiez les campagnes CM depuis le module dédié (données réelles).
          </p>
          <button type="button" onClick={() => router.push('/cm/campagnes')} className="btn btn-out btn-sm w-full">
            Ouvrir les campagnes →
          </button>
          <button type="button" onClick={() => router.push('/cm/notifications')} className="btn btn-ghost btn-sm w-full mt-2">
            Notifications CM
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Notifier client', href: '/cm/notifications', icon: Bell },
          { label: 'Campagnes CM', href: '/cm/campagnes', icon: Megaphone },
          { label: 'Nouveau client', href: '/clients', icon: Users },
          { label: 'Mon profil', href: '/rh/mon-profil', icon: Smartphone },
        ].map((a) => (
          <button key={a.href} type="button" onClick={() => router.push(a.href)} className="ans-card-premium p-4 flex items-center gap-3 text-left">
            <a.icon size={20} className="text-[#7b1fa2]" />
            <span className="text-sm font-semibold flex-1">{a.label}</span>
            <ArrowRight size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
