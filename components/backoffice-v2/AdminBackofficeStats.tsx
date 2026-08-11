'use client';

import type { AdminBackofficeOverview } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';

type Props = {
  data: AdminBackofficeOverview | null;
  loading: boolean;
  onOpenAnomalies: () => void;
  onOpenPriceTable: () => void;
  onOpenMaterials: () => void;
  onOpenSync: () => void;
  onPublish: () => void;
  onSync: () => void;
};

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: 'danger' | 'warning' | 'success';
}) {
  const toneClass =
    tone === 'danger' ? ' text-red-400' : tone === 'warning' ? ' text-amber-400' : tone === 'success' ? ' text-emerald-400' : '';
  return (
    <div className="ab2-kpi">
      <div className={`ab2-kpi-value${toneClass}`}>{value}</div>
      <div className="ab2-kpi-label">{label}</div>
    </div>
  );
}

function HealthPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`ab2-health-pill${ok ? ' ok' : ' warn'}`}>{label}</span>;
}

export function AdminBackofficeStats({
  data,
  loading,
  onOpenAnomalies,
  onOpenPriceTable,
  onOpenMaterials,
  onOpenSync,
  onPublish,
  onSync,
}: Props) {
  if (loading) {
    return (
      <div className="ab2-card ab2-card-pad">
        <LoadingState message="Chargement du tableau de bord…" size="sm" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="ab2-card ab2-card-pad">
        <ErrorState
          message="Données indisponibles — vérifiez la connexion DB."
          title="Tableau de bord indisponible"
        />
      </div>
    );
  }

  const lastPub = data.lastPublishedAt
    ? new Date(data.lastPublishedAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const syncOk = data.syncStatus === 'synced';
  const materialsOk = data.materialsDraft === 0 && data.materialsMissingPrice === 0;
  const stockOk = data.stockRupture === 0 && data.stockCritical === 0;
  const anomaliesOk = data.anomaliesCritical === 0;

  return (
    <div className="ab2-dashboard">
      <section className="ab2-health-bar">
        <h2 className="ab2-health-title">Santé système</h2>
        <div className="flex flex-wrap gap-2">
          <HealthPill ok={syncOk} label={syncOk ? 'POS synchronisé' : data.syncMessage} />
          <HealthPill
            ok={materialsOk}
            label={materialsOk ? 'Matières à jour' : `${data.materialsDraft} brouillon(s) matière`}
          />
          <HealthPill
            ok={stockOk}
            label={stockOk ? 'Stock matières OK' : `${data.stockRupture} rupture · ${data.stockCritical} faible`}
          />
          <HealthPill
            ok={anomaliesOk}
            label={anomaliesOk ? 'Aucune anomalie critique' : `${data.anomaliesCritical} critique(s)`}
          />
        </div>
      </section>

      <section className="ab2-kpi-grid">
        <Kpi label="Articles catalogue" value={data.catalogueTotal} />
        <Kpi label="Profils actifs" value={data.articlesActive} />
        <Kpi label="Visibles POS" value={data.articlesVisiblePos} />
        <Kpi label="Formules publiées" value={data.formulasPublished} />
        <Kpi label="Brouillons articles" value={data.drafts} tone={data.drafts > 0 ? 'warning' : undefined} />
        <Kpi label="Sans formule" value={data.withoutFormula} tone={data.withoutFormula > 0 ? 'warning' : undefined} />
        <Kpi label="Matières total" value={data.materialsTotal} />
        <Kpi label="Matières publiées" value={data.materialsPublished} tone="success" />
        <Kpi label="Brouillons matières" value={data.materialsDraft} tone={data.materialsDraft > 0 ? 'warning' : undefined} />
        <Kpi label="Prix manquants" value={data.materialsMissingPrice} tone={data.materialsMissingPrice > 0 ? 'warning' : undefined} />
        <Kpi label="Liées stock" value={data.materialsLinkedStock} />
        <Kpi label="Stock rupture" value={data.stockRupture} tone={data.stockRupture > 0 ? 'danger' : undefined} />
        <Kpi label="Stock faible" value={data.stockCritical} tone={data.stockCritical > 0 ? 'warning' : undefined} />
        <Kpi label="Anomalies critiques" value={data.anomaliesCritical} tone={data.anomaliesCritical > 0 ? 'danger' : undefined} />
        <Kpi label="Warnings" value={data.anomaliesWarning} tone={data.anomaliesWarning > 0 ? 'warning' : undefined} />
        <Kpi label="Modifs non publiées" value={data.unpublishedChanges} tone={data.unpublishedChanges > 0 ? 'warning' : undefined} />
      </section>

      <section className="ab2-action-grid">
        <div className="ab2-action-card">
          <h3>Publication</h3>
          <p className="text-xs text-[var(--ab2-muted)] mb-3">Moteur {data.engineVersion} · Dernière publication {lastPub}</p>
          <div className="flex flex-wrap gap-2">
            <AppButton type="button" variant="default" onClick={onPublish}>Publier</AppButton>
            <AppButton type="button" variant="outline" onClick={onSync}>Sync POS</AppButton>
          </div>
        </div>

        <div className="ab2-action-card">
          <h3>Matières & stock</h3>
          <p className="text-xs text-[var(--ab2-muted)] mb-3">
            {data.materialsWithAnomalies} matière(s) avec notes d&apos;anomalie
          </p>
          <div className="flex flex-col gap-2">
            <AppButton type="button" variant="ghost" className="text-left justify-start" onClick={onOpenMaterials}>
              Ouvrir matières & prix de base
            </AppButton>
            {(data.stockRupture > 0 || data.stockCritical > 0) && (
              <AppButton type="button" variant="ghost" className="text-left justify-start" onClick={onOpenSync}>
                Vérifier sync stock ↔ matières
              </AppButton>
            )}
          </div>
        </div>

        <div className="ab2-action-card">
          <h3>Actions urgentes</h3>
          <div className="flex flex-col gap-2 mt-1">
            {data.anomaliesCritical > 0 && (
              <AppButton type="button" variant="ghost" className="text-left justify-start" onClick={onOpenAnomalies}>
                {data.anomaliesCritical} anomalie(s) critique(s)
              </AppButton>
            )}
            {data.materialsDraft > 0 && (
              <AppButton type="button" variant="ghost" className="text-left justify-start" onClick={onOpenMaterials}>
                {data.materialsDraft} matière(s) en brouillon
              </AppButton>
            )}
            <AppButton type="button" variant="ghost" className="text-left justify-start" onClick={onOpenPriceTable}>
              Tableau prix global
            </AppButton>
          </div>
        </div>
      </section>
    </div>
  );
}
