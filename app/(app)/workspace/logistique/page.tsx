'use client';

import { useRouter } from 'next/navigation';
import { Truck, ClipboardList, Banknote, MapPin, ArrowRight, ListTodo } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ANS } from '@/lib/ans-colors';
import { formatPrice } from '@/lib/data/catalogue';
import { useCockpitStats } from '@/lib/hooks/use-cockpit-kpis';
import { CockpitErrorBanner } from '@/components/workspace/cockpit-error-banner';
import { WorkspaceFilteredViewBanner } from '@/components/workspace/workspace-filtered-view-banner';
import { AppResponsiveKpiGrid, AppStickyActionBar, AppButton } from '@/components/ui/app-ui';
import { PageHeader } from '@/components/layouts/page-header';
import { PosteTachesBoard } from '@/components/workspace/poste-taches-board';

type LivRow = { id: string; client: string; statut: string; datePrevue?: string };

export default function LogistiqueWorkspacePage() {
  const router = useRouter();
  const { kpis, lists, error, reload } = useCockpitStats('livraison');
  const livraisons = (lists.livraisonsPrevues as LivRow[]) ?? [];

  return (
    <div className="dashboard-full space-y-5 w-full">
      <PageHeader title="Mes livraisons" kicker="Mon espace" compact icon={Truck} />
      <WorkspaceFilteredViewBanner moduleLabel="Livraisons" href="/livraisons" />

      {error && <CockpitErrorBanner onRetry={reload} />}

      <PosteTachesBoard type="logistique" title="Mes livraisons / tâches du jour" />

      <AppResponsiveKpiGrid columns={4} phoneMax={3}>
        <KpiCard label="Tâches logistique" value={kpis.tachesOuvertes || 0} icon={ListTodo} color={ANS.orange} onClick={() => router.push('/equipe/taches?type=logistique')} />
        <KpiCard label="Livraisons en cours" value={kpis.livraisonsEnCours || 0} icon={Truck} color={ANS.orange} onClick={() => router.push('/livraisons?statut=En livraison')} />
        <KpiCard label="Commandes actives" value={kpis.cmdActives || 0} icon={ClipboardList} color={ANS.cyan} onClick={() => router.push('/commandes')} />
        <KpiCard label="Paiements du jour" value={kpis.paiementsRecusJour || 0} icon={Banknote} color={ANS.yellow} format="price" onClick={() => router.push('/paiements')} />
      </AppResponsiveKpiGrid>

      <div className="ans-card-premium overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center gap-3">
          <h2 className="font-semibold text-sm">Livraisons planifiées</h2>
          <button type="button" onClick={() => router.push('/livraisons')} className="text-xs text-[var(--ans-cyan)] hover:underline shrink-0">
            Ouvrir livraisons
          </button>
        </div>
        {livraisons.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <MapPin size={28} className="mx-auto mb-2 opacity-40" />
            <p>Aucune livraison planifiée aujourd&apos;hui</p>
            <button type="button" onClick={() => router.push('/livraisons')} className="mt-3 ans-btn-primary px-4 py-2 rounded-lg text-xs min-h-[44px]">
              Voir planning livraisons
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {livraisons.map((l) => (
              <button key={l.id} type="button" onClick={() => router.push(`/livraisons?id=${l.id}`)} className="w-full p-4 text-left hover:bg-accent/30 flex items-center gap-3 min-h-[52px]">
                <Truck size={18} className="text-[var(--ans-orange)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-[var(--ans-cyan)]">{l.id}</p>
                  <p className="font-medium text-sm truncate">{l.client}</p>
                  <p className="text-xs text-muted-foreground">{l.statut} · {l.datePrevue ? new Date(l.datePrevue).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {(kpis.resteAEncaisserMga ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Reste à encaisser : <strong className="text-[var(--ans-yellow)]">{formatPrice(kpis.resteAEncaisserMga)}</strong>
          {kpis.facturesImpayeesCount != null ? (
            <span className="ml-2">({kpis.facturesImpayeesCount} facture(s))</span>
          ) : null}
        </p>
      )}

      <AppStickyActionBar>
        <AppButton type="button" onClick={() => router.push('/livraisons')}>
          <Truck size={16} className="mr-1.5" /> Livraisons
        </AppButton>
        <AppButton type="button" variant="outline" onClick={() => router.push('/paiements')}>
          <Banknote size={16} className="mr-1.5" /> Encaisser
        </AppButton>
      </AppStickyActionBar>
    </div>
  );
}
