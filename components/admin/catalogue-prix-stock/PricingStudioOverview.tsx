'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Cpu,
  Layers,
} from 'lucide-react';
import type {
  PricingAnomaly,
  PricingFamilyCoverage,
  PricingOverviewStats,
} from '@/lib/pricing/pricing-types';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { AppButton } from '@/components/ui/app-ui';
import type { PricingStudioSectionId } from './PricingStudioNav';

type Props = {
  onNavigate: (section: PricingStudioSectionId) => void;
};

function pct(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

/** Vue d’ensemble Studio Prix — tableau de pilotage branché sur /api/pricing/overview. */
export function PricingStudioOverview({ onNavigate }: Props) {
  const [stats, setStats] = useState<PricingOverviewStats | null>(null);
  const [families, setFamilies] = useState<PricingFamilyCoverage[]>([]);
  const [preview, setPreview] = useState<PricingAnomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/pricing/overview');
        const d = await r.json();
        if (r.ok) {
          setStats(d.stats);
          setFamilies(Array.isArray(d.families) ? d.families : []);
          setPreview(d.anomaliesPreview ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState message="Chargement du studio tarifaire…" size="sm" />;
  if (!stats) {
    return (
      <ErrorState
        message="Impossible de charger la vue d’ensemble tarifaire."
        onRetry={() => window.location.reload()}
        className="py-8"
      />
    );
  }

  const kpiCards: {
    id: PricingStudioSectionId;
    label: string;
    value: number | string;
    detail: string;
    action: string;
    icon: typeof Layers;
    tone: 'default' | 'ok' | 'warn' | 'danger';
  }[] = [
    {
      id: 'engines',
      label: 'Moteurs couverts',
      value: families.length,
      detail:
        families.length > 0
          ? `${families.length} familles tarifaires avec profils`
          : 'Aucune famille avec profil tarifaire',
      action: 'Ouvrir les moteurs',
      icon: Cpu,
      tone: 'default',
    },
    {
      id: 'formulas',
      label: 'Profils actifs',
      value: stats.publishedProfiles,
      detail: `${stats.dynamicProfiles} profils · ${stats.draftProfiles} brouillons à compléter`,
      action: 'Gérer les formules',
      icon: Calculator,
      tone: 'ok',
    },
    {
      id: 'articles',
      label: 'À vérifier',
      value: stats.withoutProfile + stats.draftProfiles,
      detail: `${stats.withoutProfile} sans profil · ${stats.draftProfiles} à compléter`,
      action: 'Voir les tarifs articles',
      icon: CheckCircle2,
      tone: stats.withoutProfile + stats.draftProfiles > 0 ? 'warn' : 'ok',
    },
    {
      id: 'anomalies',
      label: 'Anomalies bloquantes',
      value: stats.anomaliesCritical,
      detail: `${stats.anomaliesWarning} avertissements · ${stats.fusionAnomaliesOpen} imports ouverts`,
      action: stats.anomaliesCritical > 0 ? 'Corriger' : 'Diagnostiquer',
      icon: AlertTriangle,
      tone: stats.anomaliesCritical > 0 ? 'danger' : 'ok',
    },
  ];

  const quality: { label: string; note: string; value: number | null }[] = [
    {
      label: 'Profils publiés',
      note: `${stats.publishedProfiles} publiés / ${stats.catalogueArticles} articles catalogue`,
      value: pct(stats.publishedProfiles, stats.catalogueArticles),
    },
    {
      label: 'Articles avec profil',
      note: `${Math.max(0, stats.catalogueArticles - stats.withoutProfile)} couverts / ${stats.catalogueArticles}`,
      value: pct(stats.catalogueArticles - stats.withoutProfile, stats.catalogueArticles),
    },
    {
      label: 'Formules actives',
      note: `${Math.max(0, stats.catalogueArticles - stats.withoutPublishedFormula)} avec version publiée / ${stats.catalogueArticles}`,
      value: pct(stats.catalogueArticles - stats.withoutPublishedFormula, stats.catalogueArticles),
    },
  ];

  return (
    <div className="cps-pricing-overview space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onNavigate(c.id)}
              className={[
                'cps-pricing-kpi',
                c.tone === 'danger' ? 'cps-pricing-kpi--danger' : '',
                c.tone === 'warn' ? 'cps-pricing-kpi--warn' : '',
              ].join(' ')}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="cps-pricing-kpi__label">{c.label}</span>
                <Icon className="h-4 w-4 text-slate-400" aria-hidden />
              </div>
              <p className="m-0 text-2xl font-bold tabular-nums text-slate-900">{c.value}</p>
              <p className="mt-1 text-xs text-slate-500">{c.detail}</p>
              <span className="cps-pricing-kpi__action">
                {c.action}
                <ArrowRight className="h-3 w-3" aria-hidden />
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cps-pricing-panel">
          <div className="cps-pricing-panel__head">
            <h3 className="cps-pricing-panel__title">Couverture par moteur</h3>
            <p className="cps-pricing-panel__sub">Profils tarifaires consommés par famille.</p>
          </div>
          {families.length === 0 ? (
            <p className="m-0 px-4 pb-4 text-sm text-slate-500">
              Aucun profil tarifaire — créez un profil depuis Formules & règles.
            </p>
          ) : (
            <ul className="cps-engine-coverage">
              {families.map((f) => (
                <li key={f.family}>
                  <button
                    type="button"
                    className="cps-engine-coverage__row"
                    onClick={() => onNavigate('engines')}
                    title={`${f.published} publiés · ${f.draft} brouillons`}
                  >
                    <span className="cps-engine-coverage__name">{f.family}</span>
                    <span className="cps-engine-coverage__meta">
                      {f.published > 0 ? `${f.published} actifs` : 'aucun actif'}
                      {f.draft > 0 ? ` · ${f.draft} brouillons` : ''}
                    </span>
                    <span className="cps-engine-coverage__count">{f.profiles}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cps-pricing-panel">
          <div className="cps-pricing-panel__head">
            <h3 className="cps-pricing-panel__title">Qualité tarifaire</h3>
            <p className="cps-pricing-panel__sub">
              Contrôles avant activation et projection commerciale.
            </p>
          </div>
          <div className="space-y-3 px-4 pb-4">
            {quality.map((q) => (
              <div key={q.label} className="cps-quality-row" title={q.note}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="cps-quality-row__label">{q.label}</span>
                  <span className="cps-quality-row__pct">
                    {q.value === null ? 'Non calculable' : `${q.value} %`}
                  </span>
                </div>
                <p className="cps-quality-row__note">{q.note}</p>
                <div
                  className="cps-health-progress"
                  role="progressbar"
                  aria-valuenow={q.value ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={q.label}
                >
                  <span style={{ width: `${q.value ?? 0}%` }} />
                </div>
              </div>
            ))}
            {stats.salePrices2026Active > 0 ? (
              <p className="cps-quality-debt" role="note">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Fallback legacy SalePrice2026 encore actif ({stats.salePrices2026Active} prix) —
                dette surveillée, pas un état normal.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="cps-pricing-panel">
        <div className="cps-pricing-panel__head cps-pricing-panel__head--row">
          <div>
            <h3 className="cps-pricing-panel__title">Priorités</h3>
            <p className="cps-pricing-panel__sub">
              Anomalies détectées par l’analyse tarifaire — chaque ligne mène à une action.
            </p>
          </div>
          <AppButton type="button" variant="outline" onClick={() => onNavigate('anomalies')}>
            Centre d’anomalies
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </AppButton>
        </div>
        {preview.length === 0 ? (
          <p className="m-0 px-4 pb-4 text-sm text-slate-500">
            Aucune anomalie critique en aperçu — le périmètre profils, formules et options est sain.
          </p>
        ) : (
          <div className="cps-prio-table-wrap">
            <table className="cps-prio-table">
              <thead>
                <tr>
                  <th scope="col">Sévérité</th>
                  <th scope="col">Anomalie</th>
                  <th scope="col">Entité</th>
                  <th scope="col" className="text-right">
                    Action corrective
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 6).map((a, i) => (
                  <tr key={`${a.articleId ?? a.message}-${i}`}>
                    <td>
                      <span
                        className={
                          a.severity === 'critical'
                            ? 'cps-prio-badge cps-prio-badge--danger'
                            : a.severity === 'warning'
                              ? 'cps-prio-badge cps-prio-badge--warn'
                              : 'cps-prio-badge cps-prio-badge--info'
                        }
                      >
                        {a.severity === 'critical'
                          ? 'Bloquant'
                          : a.severity === 'warning'
                            ? 'Attention'
                            : 'Info'}
                      </span>
                    </td>
                    <td>{a.message}</td>
                    <td>
                      {a.articleId ? (
                        <code className="cps-pricing-code">{a.articleId}</code>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="cps-prio-action"
                        onClick={() => onNavigate(a.articleId ? 'articles' : 'anomalies')}
                      >
                        {a.recommendedAction || 'Ouvrir'}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
