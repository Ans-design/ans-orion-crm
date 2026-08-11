'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Download, TrendingUp, ShoppingCart, FileText, Package, Users, Wallet, AlertCircle, Star, MessageSquareWarning, Truck } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import {
  AppListSkeleton, AppButton,
} from '@/components/ui/app-ui';
import { OrionPageHeader } from '@/components/orion';
import { useCanViewMargin } from '@/hooks/use-can-view-margin';
import { formatPriceAr } from '@/lib/data/catalogue';
import { useModuleDateFilter } from '@/components/layout/module-date-filter-context';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { unwrapApiData } from '@/lib/api-client';
import { ComptableExportButton } from '@/components/finance/comptable-export-button';

type Report = {
  period: string;
  caEncaisse: number;
  caCommandes: number;
  commandesCount: number;
  devisCount: number;
  devisAcceptes: number;
  tauxConversionDevis: number;
  achatsTotal?: number;
  chargesTotal?: number;
  margeEstimee?: number;
  stockCritique: number;
  impayes?: number;
  masseSalarialeBrute?: number;
  effectifActif?: number;
  avancesEnCours?: number;
  caAnneePrecedente?: number;
  evolutionCaPct?: number | null;
  paiementsByMode: Record<string, number>;
  commandesByStatut: Record<string, number>;
  livraisonsCount?: number;
  livraisonsLivrees?: number;
  colisLivres?: number;
  livraisonsByStatut?: Record<string, number>;
  livraisonsByCarrier?: Record<string, number>;
};

export default function RapportsPage() {
  const router = useRouter();
  const { filter, queryString, revision } = useModuleDateFilter();
  const reportPeriod = (filter.period === 'all' ? 'year' : filter.period) as 'day' | 'week' | 'month' | 'year';
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [crmSummary, setCrmSummary] = useState<{ actifs: number; vip: number; nouveauxMois: number; reclamations: number } | null>(null);
  const showMargin = useCanViewMargin();

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    void revision;
    setLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams(queryString);
      qs.set('period', reportPeriod);
      const r = await fetchWithTimeout(`/api/reports?${qs}`, { timeout: 15_000 });
      if (r.ok) {
        setReport(unwrapApiData<Report>(await r.json()));
      } else {
        setReport(null);
        setLoadError('Impossible de charger le rapport');
      }
    } catch {
      setReport(null);
      setLoadError('Délai dépassé — réessayez');
      uxToast.error('Erreur chargement rapport');
    } finally { setLoading(false); }
  }, [queryString, reportPeriod, revision]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchWithTimeout('/api/clients?summary=1', { timeout: 10_000 })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCrmSummary(d))
      .catch(() => { console.warn('[rapports] fetch secondary failed'); });
  }, []);

  const exportCsv = () => {
    const qs = new URLSearchParams(queryString);
    qs.set('period', reportPeriod);
    window.open(`/api/reports/export?${qs}`, '_blank');
    uxToast.success('Export CSV lancé');
  };

  return (
    <div className="orion-page">
      <OrionPageHeader
        icon={BarChart3}
        title="Rapports"
        description={showMargin
          ? 'Pilotage direction — CA, conversion, achats, marge estimée'
          : 'Activité commerciale — CA et conversion'}
        actions={
          <div className="flex flex-wrap gap-2">
            <AppButton size="sm" variant="outline" asChild>
              <a href="/rapports/performance" className="gap-2 inline-flex items-center">
                <BarChart3 size={14} /> Performance machines & équipes
              </a>
            </AppButton>
            <AppButton size="sm" onClick={exportCsv} className="gap-2"><Download size={14} /> Export activité</AppButton>
            <ComptableExportButton filter={filter} />
          </div>
        }
      />

      {loadError ? (
        <div className="rounded-[7px] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {loadError}
        </div>
      ) : loading ? <AppListSkeleton rows={4} /> : report && (
        <>
          <div className="orion-kpi-grid">
            {[
              { label: 'CA encaissé', value: formatPriceAr(report.caEncaisse), icon: TrendingUp, color: 'text-green-500' },
              { label: 'CA commandes', value: formatPriceAr(report.caCommandes), icon: ShoppingCart, color: 'text-primary' },
              ...(showMargin && report.margeEstimee != null
                ? [{ label: 'Marge estimée', value: formatPriceAr(report.margeEstimee), icon: BarChart3, color: 'text-[var(--primary)]' }]
                : []),
              ...(showMargin && report.achatsTotal != null
                ? [{ label: 'Achats', value: formatPriceAr(report.achatsTotal), icon: Package, color: 'text-orange-500' }]
                : []),
            ].map((k) => (
              <div key={k.label} className="orion-card-interactive p-4">
                <k.icon size={18} className={`${k.color} mb-2`} />
                <p className="text-lg font-bold truncate">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            ))}
          </div>

          {report.period === 'year' && showMargin && (
            <div className="orion-card-interactive p-4">
              <h3 className="orion-section-title mb-3 flex items-center gap-2">
                <BarChart3 size={16} /> Rapport annuel direction
              </h3>
              <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="flex justify-between sm:flex-col gap-1">
                  <dt className="text-muted-foreground flex items-center gap-1"><Wallet size={14} /> Impayés clients</dt>
                  <dd className="font-bold text-red-600">{formatPriceAr(report.impayes ?? 0)}</dd>
                </div>
                <div className="flex justify-between sm:flex-col gap-1">
                  <dt className="text-muted-foreground flex items-center gap-1"><Users size={14} /> Effectif actif</dt>
                  <dd className="font-bold">{report.effectifActif ?? 0}</dd>
                </div>
                {typeof report.masseSalarialeBrute === 'number' && (
                  <div className="flex justify-between sm:flex-col gap-1">
                    <dt className="text-muted-foreground">Masse salariale brute</dt>
                    <dd className="font-bold">{formatPriceAr(report.masseSalarialeBrute)}</dd>
                  </div>
                )}
                {typeof report.avancesEnCours === 'number' && (
                  <div className="flex justify-between sm:flex-col gap-1">
                    <dt className="text-muted-foreground">Avances en cours</dt>
                    <dd className="font-bold">{formatPriceAr(report.avancesEnCours)}</dd>
                  </div>
                )}
                {report.caAnneePrecedente != null && (
                  <div className="flex justify-between sm:flex-col gap-1">
                    <dt className="text-muted-foreground">CA année N-1</dt>
                    <dd className="font-bold">{formatPriceAr(report.caAnneePrecedente)}</dd>
                  </div>
                )}
                {report.evolutionCaPct != null && (
                  <div className="flex justify-between sm:flex-col gap-1">
                    <dt className="text-muted-foreground flex items-center gap-1"><TrendingUp size={14} /> Évolution CA</dt>
                    <dd className={`font-bold ${report.evolutionCaPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {report.evolutionCaPct > 0 ? '+' : ''}{report.evolutionCaPct}%
                    </dd>
                  </div>
                )}
                {report.chargesTotal != null && (
                  <div className="flex justify-between sm:flex-col gap-1">
                    <dt className="text-muted-foreground flex items-center gap-1"><AlertCircle size={14} /> Charges période</dt>
                    <dd className="font-bold">{formatPriceAr(report.chargesTotal)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="orion-card-interactive p-4">
              <h3 className="orion-section-title mb-3 flex items-center gap-2"><FileText size={16} /> Commercial</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Commandes</dt><dd><Link href="/commandes" className="text-[var(--ans-cyan)] hover:underline">{report.commandesCount}</Link></dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Devis</dt><dd><Link href="/devis" className="text-[var(--ans-cyan)] hover:underline">{report.devisCount}</Link></dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Devis acceptés</dt><dd>{report.devisAcceptes}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Taux conversion</dt><dd>{report.tauxConversionDevis}%</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Stock critique</dt><dd><Link href="/stock" className="text-orange-500 hover:underline">{report.stockCritique}</Link></dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Hub commandes</dt><dd><Link href="/commandes" className="text-[var(--ans-cyan)] hover:underline">Ouvrir dossiers</Link></dd></div>
              </dl>
            </div>

            <div className="bg-card border border-border rounded-[7px] p-4">
              <h3 className="font-semibold mb-3">Paiements par mode</h3>
              {Object.keys(report.paiementsByMode).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun paiement sur la période</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {Object.entries(report.paiementsByMode).map(([mode, amt]) => (
                    <li key={mode} className="flex justify-between"><span>{mode}</span><span>{formatPriceAr(amt)}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {Object.keys(report.commandesByStatut).length > 0 && (
            <div className="bg-card border border-border rounded-[7px] p-4">
              <h3 className="font-semibold mb-3">Commandes par statut</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.commandesByStatut).map(([st, n]) => (
                  <Link
                    key={st}
                    href={`/commandes?statut=${encodeURIComponent(st)}`}
                    className="text-sm px-3 py-1 rounded-full bg-accent hover:bg-accent/80 transition"
                  >
                    {st}: {n}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(report.livraisonsCount ?? 0) > 0 && (
            <div className="orion-card-interactive p-4">
              <h3 className="orion-section-title mb-3 flex items-center gap-2">
                <Truck size={16} /> Logistique — livraisons
              </h3>
              <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
                <div className="flex justify-between sm:flex-col gap-1">
                  <dt className="text-muted-foreground">Expéditions période</dt>
                  <dd className="font-bold">{report.livraisonsCount}</dd>
                </div>
                <div className="flex justify-between sm:flex-col gap-1">
                  <dt className="text-muted-foreground">Livraisons terminées</dt>
                  <dd className="font-bold text-green-600">{report.livraisonsLivrees ?? 0}</dd>
                </div>
                <div className="flex justify-between sm:flex-col gap-1">
                  <dt className="text-muted-foreground">Colis livrés</dt>
                  <dd className="font-bold">{report.colisLivres ?? 0}</dd>
                </div>
              </dl>
              {Object.keys(report.livraisonsByCarrier ?? {}).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Par transporteur — cliquer pour filtrer</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(report.livraisonsByCarrier ?? {}).map(([carrier, n]) => (
                      <Link
                        key={carrier}
                        href={`/livraisons?livreur=${encodeURIComponent(carrier)}`}
                        className="text-sm px-3 py-1 rounded-full bg-accent hover:bg-accent/80 transition"
                      >
                        {carrier}: {n}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {(report.livraisonsCount ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => router.push('/livraisons')}
                  className="mt-3 text-xs text-[var(--ans-cyan)] hover:underline"
                >
                  Voir toutes les livraisons de la période →
                </button>
              )}
            </div>
          )}

          <section className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">Analyses & CRM — Page 2</h2>
                <p className="text-sm text-muted-foreground">Synthèse clients, performance atelier et indicateurs avancés</p>
              </div>
              <AppButton size="sm" variant="outline" asChild>
                <Link href="/rapports/performance" className="gap-2 inline-flex items-center">
                  <BarChart3 size={14} /> Ouvrir analyses performance
                </Link>
              </AppButton>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Clients actifs', value: crmSummary?.actifs ?? '—', icon: Users, color: 'text-green-500' },
                { label: 'VIP / Premium', value: crmSummary?.vip ?? '—', icon: Star, color: 'text-amber-500' },
                { label: 'Nouveaux / mois', value: crmSummary?.nouveauxMois ?? '—', icon: Users, color: 'text-[var(--primary)]' },
                { label: 'Réclamations ouvertes', value: crmSummary?.reclamations ?? '—', icon: MessageSquareWarning, color: 'text-orange-500' },
              ].map((k) => (
                <div key={k.label} className="bg-card border border-border rounded-[7px] p-4">
                  <k.icon size={18} className={`${k.color} mb-2`} />
                  <p className="text-lg font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
