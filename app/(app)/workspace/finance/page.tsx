'use client';

import { useRouter } from 'next/navigation';
import { Wallet, Receipt, Banknote, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ANS, ANS_KPI_COLORS } from '@/lib/ans-colors';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { WorkspaceFilteredViewBanner } from '@/components/workspace/workspace-filtered-view-banner';
import { PageHeader } from '@/components/layouts/page-header';
import { PosteTachesBoard } from '@/components/workspace/poste-taches-board';

export default function FinanceWorkspacePage() {
  const router = useRouter();
  const { kpis, alertes, error, reload } = useCockpitStats('caisse');

  return (
    <div className="dashboard-full space-y-5 w-full">
      <PageHeader title="Mon espace finance" kicker="Mon espace" compact icon={Wallet} />
      <WorkspaceFilteredViewBanner moduleLabel="Finance" href="/factures" />

      {error && <CockpitErrorBanner onRetry={reload} />}

      <PosteTachesBoard title="Mes tâches finance du jour" />

      <div className="grid gap-3 kpi-grid">
        <KpiCard label="Trésorerie mois" value={kpis.tresorerieMois || 0} icon={TrendingUp} color={ANS_KPI_COLORS.success} format="price" onClick={() => router.push('/finance/charges')} />
        <KpiCard label="Créances clients" value={kpis.facturesImpayees || 0} icon={Receipt} color={ANS.yellow} format="price" onClick={() => router.push('/factures')} />
        <KpiCard label="Factures en retard" value={kpis.facturesEnRetard || 0} icon={AlertTriangle} color={ANS.red} onClick={() => router.push('/factures')} />
        <KpiCard label="Paiements du jour" value={kpis.paiementsRecusJour || 0} icon={Banknote} color={ANS.cyan} format="price" onClick={() => router.push('/paiements')} />
        <KpiCard label="Charges mois" value={kpis.chargesMois || 0} icon={Wallet} color={ANS.orange} format="price" onClick={() => router.push('/finance/charges')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'Ouvrir caisse', href: '/caisse', icon: Wallet },
          { label: 'Factures', href: '/factures', icon: Receipt },
          { label: 'Paiements', href: '/paiements', icon: Banknote },
          { label: 'Charges & dépenses', href: '/finance/charges', icon: TrendingUp },
          { label: 'Coûts de revient', href: '/finance/couts-revient', icon: Wallet },
          { label: 'Ventes directes', href: '/finance/ventes-directes', icon: Receipt },
        ].map((a) => (
          <button key={a.href} type="button" onClick={() => router.push(a.href)} className="ans-card-premium p-4 flex items-center gap-3 text-left">
            <a.icon size={20} className="text-[var(--ans-yellow)]" />
            <span className="text-sm font-semibold flex-1">{a.label}</span>
            <ArrowRight size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>

      {alertes.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase text-muted-foreground">Alertes finance</h2>
          {alertes.map((a) => (
            <button key={a.label} type="button" onClick={() => router.push(a.href)} className="primary-alert w-full flex items-center gap-2 px-4 py-2.5 rounded-[7px] text-xs font-semibold text-left">
              <AlertTriangle size={14} /> {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
