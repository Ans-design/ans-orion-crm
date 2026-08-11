'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { ProductionStatusPanel, type ProductionStatusData } from '@/components/admin/production-status-panel';
import {
  AlertCard,
  MetricCell,
  MetricGrid,
  SectionBlock,
  SectionStack,
} from '@/components/ui/section-layout';

type Props = {
  health: Record<string, unknown>;
  prodStatus?: ProductionStatusData | null;
  fusionStatus?: {
    ok?: boolean;
    fusion?: {
      materials: number;
      salePrices: number;
      anomaliesOpen: number;
      activeReservations: number;
    };
  } | null;
  dynamicPricingStats?: Record<string, number> | null;
  auditLogs?: {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    entityLabel: string | null;
    userName: string | null;
    createdAt: string;
  }[];
  syncStatus?: Record<string, unknown> | null;
  role: string;
  canEdit: boolean;
  syncingCatalog: boolean;
  onSyncCatalog: () => void;
  onSelectTab: (tab: string) => void;
};

export function AdminControlSanteTab({
  health,
  prodStatus,
  fusionStatus,
  dynamicPricingStats,
  auditLogs,
  syncStatus,
  role,
  canEdit,
  syncingCatalog,
  onSyncCatalog,
  onSelectTab,
}: Props) {
  const catalogDrift = health.catalogDrift as {
    totalDrift?: number;
    missingChipIds?: string[];
    missingArticleIds?: string[];
    labelMismatches?: string[];
    details?: string[];
  } | undefined;

  const pendingDetails = (health.pendingChanges as { details?: string[] } | undefined)?.details;

  return (
    <SectionStack>
      {prodStatus && (
        <ProductionStatusPanel prodStatus={prodStatus} showSeed={role === 'admin'} />
      )}

      {(catalogDrift?.totalDrift ?? 0) > 0 && (
        <AlertCard
          tone="warning"
          icon={AlertTriangle}
          title="Dérive catalogue ↔ admin"
          description={(
            <>
              {(catalogDrift?.missingChipIds?.length ?? 0)} chip(s) · {(catalogDrift?.missingArticleIds?.length ?? 0)} article(s) ·{' '}
              {(catalogDrift?.labelMismatches?.length ?? 0)} libellé(s)
              <ul className="mt-1 space-y-0.5 orion-text-meta">
                {(catalogDrift?.details ?? []).slice(0, 4).map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </>
          )}
          action={
            canEdit ? (
              <button
                type="button"
                disabled={syncingCatalog}
                onClick={onSyncCatalog}
                className="ans-btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)]"
              >
                {syncingCatalog ? 'Sync…' : 'Resynchroniser'}
              </button>
            ) : undefined
          }
        />
      )}

      <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
        <SectionBlock title="Impact publication en attente">
          <ul className="text-xs space-y-1 text-[var(--text-muted)] max-h-48 overflow-y-auto">
            {(pendingDetails?.length ? pendingDetails : ['Aucun changement en attente']).map((d, i) => (
              <li key={i}>• {d}</li>
            ))}
          </ul>
        </SectionBlock>

        <SectionBlock title="Moteur tarification dynamique">
          {dynamicPricingStats ? (
            <MetricGrid columns={4}>
              <MetricCell label="Profils" value={dynamicPricingStats.profiles ?? 0} />
              <MetricCell label="Actifs" value={dynamicPricingStats.published ?? 0} tone="ok" />
              <MetricCell label="Stock" value={dynamicPricingStats.stockRules ?? 0} />
              <MetricCell label="Urgence" value={dynamicPricingStats.urgencyRules ?? 0} />
            </MetricGrid>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">Statistiques indisponibles — sync catalogue requis.</p>
          )}
          <Link
            href="/administration/articles"
            className="inline-flex mt-3 text-xs px-3 py-1.5 rounded-[7px] bg-[var(--ans-pink-500)]/10 text-[var(--ans-pink-500)] font-semibold hover:opacity-90"
          >
            Ouvrir moteur de prix →
          </Link>
        </SectionBlock>

        <SectionBlock title="Sync catalogue & prix">
          {syncStatus ? (
            <div className="text-xs space-y-1 text-[var(--text-muted)]">
              <p>Config : <strong className="text-[var(--text-primary)]">{String(syncStatus.configStatus ?? '—')}</strong></p>
              <p>Profils publiés : <strong className="text-[var(--text-primary)]">{String(syncStatus.pricingProfiles ?? 0)}</strong></p>
              {(syncStatus.posSyncRecommended as boolean) && (
                <p className="text-[var(--ans-orange-500)]">Resynchronisation POS recommandée</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">Statut sync indisponible</p>
          )}
        </SectionBlock>

        <SectionBlock title="Liens rapides">
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="text-xs px-3 py-1.5 rounded-[7px] bg-[var(--ans-pink-500)]/10 text-[var(--ans-pink-500)] font-semibold">Hub Backoffice →</Link>
            <Link href="/administration/catalogue-prix-stock" className="text-xs px-3 py-1.5 rounded-[7px] bg-[var(--ans-gold-500)]/10 text-[var(--ans-gold-500)] font-semibold">Studio Prix →</Link>
            <AppButton variant="outline" size="sm" asChild>
              <Link href="/admin/pricing?tab=prix2026">PRIX 2026 (archive) →</Link>
            </AppButton>
            <AppButton variant="outline" size="sm" asChild>
              <Link href="/parametres/regles">Règles métier →</Link>
            </AppButton>
            <AppButton variant="outline" size="sm" asChild>
              <Link href="/historique">Audit →</Link>
            </AppButton>
            <AppButton type="button" variant="outline" size="sm" onClick={() => onSelectTab('variables')}>
              Variables →
            </AppButton>
          </div>
          {fusionStatus?.ok && fusionStatus.fusion && (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Fusion : {fusionStatus.fusion.materials} matières · {fusionStatus.fusion.salePrices} prix ·{' '}
              {fusionStatus.fusion.anomaliesOpen} anomalie(s)
            </p>
          )}
          <p className="orion-text-meta mt-2">
            Dernière publication :{' '}
            {health.lastPublishedAt
              ? new Date(String(health.lastPublishedAt)).toLocaleString('fr-FR')
              : '—'}
          </p>
        </SectionBlock>
      </div>

      <SectionBlock title="Derniers événements audit">
        <ul className="text-xs space-y-1 text-[var(--text-muted)] max-h-40 overflow-y-auto">
          {(auditLogs?.length ? auditLogs : []).map((log) => (
            <li key={log.id}>
              • {new Date(log.createdAt).toLocaleString('fr-FR')} — {log.userName ?? 'Système'} : {log.action} ({log.entity}{log.entityLabel ? ` · ${log.entityLabel}` : ''})
            </li>
          ))}
          {!auditLogs?.length && <li>Aucun événement récent</li>}
        </ul>
      </SectionBlock>
    </SectionStack>
  );
}
