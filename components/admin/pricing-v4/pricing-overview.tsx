'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle, Sparkles, Package,
} from 'lucide-react';
import type { PricingAnomaly, PricingOverviewStats } from '@/lib/pricing/pricing-types';
import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  AlertCard,
  MetricCell,
  MetricGrid,
  SectionBlock,
  SectionCard,
  SectionStack,
} from '@/components/ui/section-layout';

type Props = {
  onSelectTab: (tab: string) => void;
};

export function PricingOverview({ onSelectTab }: Props) {
  const [stats, setStats] = useState<PricingOverviewStats | null>(null);
  const [preview, setPreview] = useState<PricingAnomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/pricing/overview');
        const d = await r.json();
        if (r.ok) {
          setStats(d.stats);
          setPreview(d.anomaliesPreview ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <LoadingState message="Chargement de la vue d'ensemble…" size="sm" />;
  }

  if (!stats) {
    return (
      <ErrorState
        message="Impossible de charger la vue d'ensemble backoffice."
        onRetry={() => window.location.reload()}
        className="py-8"
      />
    );
  }

  const kpis = [
    { label: 'Articles catalogue', value: stats.catalogueArticles, tone: 'brand' as const },
    { label: 'Profils moteur', value: stats.dynamicProfiles, tone: 'brand' as const },
    { label: 'Actifs POS', value: stats.publishedProfiles, tone: 'ok' as const },
    { label: 'À corriger', value: stats.draftProfiles, tone: 'warn' as const },
    { label: 'Sans profil', value: stats.withoutProfile, tone: stats.withoutProfile ? 'danger' as const : 'default' as const },
    { label: 'PRIX 2026 actifs', value: stats.salePrices2026Active, tone: 'gold' as const },
    { label: 'Anomalies critiques', value: stats.anomaliesCritical, tone: stats.anomaliesCritical ? 'danger' as const : 'ok' as const },
    { label: 'Warnings', value: stats.anomaliesWarning, tone: 'warn' as const },
  ];

  return (
    <SectionStack>
      <AlertCard
        tone="info"
        icon={Sparkles}
        title="Tarification Dynamique V4"
        description="Source unique : moteur publié → POS, simulateur, devis et panier. PRIX 2026 = archive migration uniquement."
      />

      <MetricGrid columns={4}>
        {kpis.map((k) => (
          <MetricCell key={k.label} label={k.label} value={k.value} tone={k.tone} />
        ))}
      </MetricGrid>

      <div className="grid md:grid-cols-2 gap-4">
        <SectionCard title="Moteur dynamique" padded>
          <ul className="text-xs space-y-2 text-[var(--text-muted)]">
            <li className="flex justify-between"><span>Groupes options</span><strong className="font-mono">{stats.optionGroups}</strong></li>
            <li className="flex justify-between"><span>Formules</span><strong className="font-mono">{stats.formulas}</strong></li>
            <li className="flex justify-between"><span>Règles stock</span><strong className="font-mono">{stats.stockRules}</strong></li>
            <li className="flex justify-between"><span>Règles urgence</span><strong className="font-mono">{stats.urgencyRules}</strong></li>
            <li className="flex justify-between"><span>Prix matières</span><strong className="font-mono">{stats.materialPrices}</strong></li>
          </ul>
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onSelectTab('engine')}
          >
            Ouvrir moteur prix →
          </AppButton>
        </SectionCard>

        <SectionCard title="Migration PRIX 2026" padded>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {stats.salePrices2026Active} lignes actives · {stats.publishedProfiles}/{stats.catalogueArticles} articles sur moteur publié
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onSelectTab('migration')} className="text-xs px-3 py-1.5 rounded-[7px] bg-[var(--ans-gold-500)]/10 text-[var(--ans-gold-500)] font-semibold">
              Comparateur →
            </button>
            <AppButton type="button" variant="outline" size="sm" onClick={() => onSelectTab('migration')}>
              Grille PRIX 2026 →
            </AppButton>
          </div>
        </SectionCard>
      </div>

      {preview.length > 0 && (
        <SectionBlock
          title="Anomalies récentes"
          actions={(
            <button type="button" onClick={() => onSelectTab('anomalies')} className="text-xs text-primary font-semibold">
              Voir tout →
            </button>
          )}
        >
          <ul className="space-y-2">
            {preview.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-xs py-2">
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                  a.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                  a.severity === 'warning' ? 'bg-orange-500/20 text-orange-500' :
                  'bg-muted text-muted-foreground'
                }`}>{a.severity}</span>
                <div className="min-w-0">
                  <p>{a.message}</p>
                  <p className="text-[var(--text-muted)] mt-0.5">{a.recommendedAction}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}

      {stats.anomaliesCritical === 0 && stats.withoutProfile === 0 && (
        <p className="text-xs text-emerald-500 flex items-center gap-1 justify-center py-1">
          <CheckCircle size={14} /> Catalogue entièrement couvert — aucune anomalie critique
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs pt-2">
        <AppButton type="button" variant="outline" size="sm" onClick={() => onSelectTab('settings')}>
          <Package size={12} /> Matières & paramètres
        </AppButton>
        <AppButton variant="outline" size="sm" asChild>
          <Link href="/parametres/regles">Règles métier</Link>
        </AppButton>
        <AppButton variant="outline" size="sm" asChild>
          <Link href="/historique">Audit log</Link>
        </AppButton>
      </div>
    </SectionStack>
  );
}
