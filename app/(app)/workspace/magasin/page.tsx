'use client';

import { useRouter } from 'next/navigation';
import { Package, AlertTriangle, ShoppingBag, ArrowRight, ClipboardList } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ANS } from '@/lib/ans-colors';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { AppResponsiveKpiGrid, AppStickyActionBar, AppButton } from '@/components/ui/app-ui';
import { PageHeader } from '@/components/layouts/page-header';

/** Espace magasinier / responsable stock — audit item 11 */
export default function MagasinWorkspacePage() {
  const router = useRouter();
  const { kpis, error, reload } = useCockpitStats('magasin', { profile: 'magasin' });

  return (
    <div className="dashboard-full space-y-5 w-full">
      <PageHeader title="Mon Magasin" kicker="Mon espace" compact icon={Package} />

      {error && <CockpitErrorBanner onRetry={reload} />}

      <AppResponsiveKpiGrid columns={4} phoneMax={3}>
        <KpiCard label="Références actives" value={kpis.stockReferences ?? 0} icon={Package} color={ANS.orange} onClick={() => router.push('/stock')} />
        <KpiCard label="Stock critique" value={kpis.stockCritique ?? 0} icon={AlertTriangle} color={ANS.red} onClick={() => router.push('/stock')} />
        <KpiCard label="Ruptures" value={kpis.ruptures ?? 0} icon={AlertTriangle} color={ANS.red} onClick={() => router.push('/stock')} />
        <KpiCard label="Sous seuil" value={kpis.sousSeuil ?? 0} icon={ClipboardList} color={ANS.yellow} onClick={() => router.push('/stock')} />
      </AppResponsiveKpiGrid>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Gestion stocks', href: '/stock', icon: Package },
          { label: 'Achats fournisseurs', href: '/achats', icon: ShoppingBag },
          { label: 'Fournisseurs', href: '/fournisseurs', icon: ShoppingBag },
          { label: 'Déchets & pertes', href: '/production/dechets', icon: AlertTriangle },
        ].map((a) => (
          <button key={a.href} type="button" onClick={() => router.push(a.href)} className="ans-card-premium p-4 flex items-center gap-3 text-left min-h-[52px]">
            <a.icon size={20} className="text-[var(--ans-cyan)]" />
            <span className="text-sm font-semibold flex-1">{a.label}</span>
            <ArrowRight size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>

      <AppStickyActionBar>
        <AppButton type="button" onClick={() => router.push('/stock')}>
          <Package size={16} className="mr-1.5" /> Stock
        </AppButton>
        <AppButton type="button" variant="outline" onClick={() => router.push('/achats')}>
          <ShoppingBag size={16} className="mr-1.5" /> Achats
        </AppButton>
      </AppStickyActionBar>
    </div>
  );
}
