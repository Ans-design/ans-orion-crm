'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';
import { unwrapApiData } from '@/lib/api-client';
import { buildBackofficeUrl } from '@/lib/backoffice/backoffice-url';
import { macroForModule } from '@/lib/administration/admin-macro-modules';
import type { AdminBackofficeModuleId } from '@/lib/backoffice/admin-modules';
import type { AdminBackofficeOverview } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import type { PricingAnomaly } from '@/lib/pricing/pricing-types';
import type { BackofficeAuditEntry } from '@/lib/server/modules/backoffice/backoffice.types';
import { CatalogueCockpitHost } from '@/components/administration/overview/CatalogueCockpitHost';
import './overview-unified.css';

type Props = { canEdit: boolean };

type AlertLevel = 'critical' | 'warning' | 'info';

type AlertItem = {
  id: string;
  level: AlertLevel;
  title: string;
  summary: string;
  href?: string;
};

type AnomalyList = {
  items: PricingAnomaly[];
  critical: number;
  warning: number;
  info: number;
};

const AUDIT_LIMIT = 15;
const ANOMALY_PREVIEW = 8;

function bo(tab: string, module: AdminBackofficeModuleId) {
  return buildBackofficeUrl('', {
    macro: macroForModule(module),
    hub: null,
    tab,
    module,
  });
}

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

function buildAlerts(
  data: AdminBackofficeOverview,
  anomalies: AnomalyList | null,
  driftScore?: number,
): AlertItem[] {
  const out: AlertItem[] = [];

  if (driftScore != null && driftScore > 0) {
    out.push({
      id: 'sync-drift',
      level: driftScore >= 6 ? 'critical' : 'warning',
      title: 'Dérive Admin / POS',
      summary: `Score drift ${driftScore} — vérifier synchronisation`,
      href: '/administration/synchronisation',
    });
  }

  if (data.anomaliesCritical > 0) {
    out.push({
      id: 'anom-crit',
      level: 'critical',
      title: 'Anomalies critiques',
      summary: `${data.anomaliesCritical} anomalie(s) tarifaire(s) critique(s)`,
      href: bo('anomalies', 'audit'),
    });
  }
  if (data.materialsMissingPrice > 0) {
    out.push({
      id: 'price-missing',
      level: 'warning',
      title: 'Prix manquants',
      summary: `${data.materialsMissingPrice} matière(s) sans prix de base`,
      href: '/administration/matieres?chip=missingPrice',
    });
  }
  if (data.drafts > 0 || data.materialsDraft > 0) {
    out.push({
      id: 'drafts',
      level: 'warning',
      title: 'Brouillons',
      summary: `${data.drafts} article(s) · ${data.materialsDraft} matière(s) en brouillon`,
      href: data.materialsDraft > 0
        ? '/administration/matieres?chip=draft'
        : '/administration/catalogue-pos?studio=chips',
    });
  }
  if (data.unpublishedChanges > 0) {
    out.push({
      id: 'unpublished',
      level: 'warning',
      title: 'Publication en attente',
      summary: `${data.unpublishedChanges} modification(s) non publiée(s)`,
      href: bo('sync', 'stock'),
    });
  }
  if (data.stockRupture > 0 || data.stockCritical > 0) {
    out.push({
      id: 'stock',
      level: data.stockRupture > 0 ? 'critical' : 'warning',
      title: 'Stock matières',
      summary: `${data.stockRupture} rupture(s) · ${data.stockCritical} stock faible`,
      href: '/administration/matieres?view=stock',
    });
  }
  if (data.withoutFormula > 0) {
    out.push({
      id: 'no-formula',
      level: 'info',
      title: 'Profils incomplets',
      summary: `${data.withoutFormula} article(s) sans formule publiée`,
      href: bo('pricing-custom', 'pricing'),
    });
  }

  for (const a of anomalies?.items.slice(0, 6) ?? []) {
    if (out.some((x) => x.id === a.id)) continue;
    out.push({
      id: a.id,
      level: a.severity,
      title: a.source,
      summary: a.message,
      href: a.articleId
        ? `/administration/catalogue-pos?studio=chips&article=${encodeURIComponent(a.articleId)}`
        : bo('anomalies', 'audit'),
    });
  }

  return out;
}

export function OverviewUnifiedWorkspace({ canEdit }: Props) {
  const [overview, setOverview] = useState<AdminBackofficeOverview | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyList | null>(null);
  const [auditRows, setAuditRows] = useState<BackofficeAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [driftScore, setDriftScore] = useState<number | null>(null);
  const [alertFilter, setAlertFilter] = useState<'all' | AlertLevel>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, anRes, auditRes, driftRes] = await Promise.all([
        fetch('/api/admin-backoffice/overview', { cache: 'no-store' }),
        fetch('/api/admin-backoffice/anomalies', { cache: 'no-store' }),
        fetch(`/api/admin-backoffice/audit-log?limit=${AUDIT_LIMIT}`, { cache: 'no-store' }),
        fetch('/api/backoffice/sync-diagnostics', { cache: 'no-store' }),
      ]);
      if (ovRes.ok) {
        const ov = await ovRes.json();
        if ((ov as { ok?: boolean }).ok !== false) {
          setOverview(unwrapApiData<AdminBackofficeOverview>(ov));
        }
      }
      if (anRes.ok) {
        const an = await anRes.json();
        if ((an as { ok?: boolean }).ok !== false) {
          setAnomalies(unwrapApiData<AnomalyList>(an));
        }
      }
      if (auditRes.ok) {
        const audit = await auditRes.json();
        if ((audit as { ok?: boolean }).ok !== false) {
          setAuditRows(unwrapApiData<BackofficeAuditEntry[]>(audit) ?? []);
        }
      }
      if (driftRes.ok) {
        const drift = await driftRes.json() as {
          ok?: boolean;
          summary?: { driftScore?: number };
          driftReport?: { totalScore?: number };
          totalScore?: number;
        };
        const score =
          drift.summary?.driftScore
          ?? drift.driftReport?.totalScore
          ?? drift.totalScore;
        setDriftScore(typeof score === 'number' ? score : null);
      }
    } catch {
      uxToast.error('Erreur chargement vue d\'ensemble');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const publish = async () => {
    if (!canEdit) return;
    setPublishing(true);
    try {
      const r = await fetch('/api/admin-backoffice/publish', { method: 'POST' });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Configuration publiée');
        await load();
      } else uxToast.error(d.error?.message ?? 'Publication échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setPublishing(false);
  };

  const syncPos = async () => {
    if (!canEdit) return;
    setSyncing(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/sync-pos', { method: 'POST' });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success(d.data?.message ?? ADMIN_UI.syncPos);
        await load();
      } else uxToast.error(d.error?.message ?? 'Sync échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSyncing(false);
  };

  const alerts = useMemo(
    () => (overview ? buildAlerts(overview, anomalies, driftScore ?? undefined) : []),
    [overview, anomalies, driftScore],
  );

  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'all') return alerts;
    return alerts.filter((a) => a.level === alertFilter);
  }, [alerts, alertFilter]);

  const alertCounts = useMemo(() => ({
    critical: alerts.filter((a) => a.level === 'critical').length,
    warning: alerts.filter((a) => a.level === 'warning').length,
    info: alerts.filter((a) => a.level === 'info').length,
  }), [alerts]);

  const anomalyPreview = useMemo(() => {
    const items = anomalies?.items ?? [];
    const critical = items.filter((a) => a.severity === 'critical').slice(0, 5);
    const warning = items.filter((a) => a.severity === 'warning').slice(0, 3);
    return [...critical, ...warning].slice(0, ANOMALY_PREVIEW);
  }, [anomalies]);

  if (loading && !overview) {
    return (
      <div className="ab2-card ab2-card-pad">
        <p className="ab2-empty text-sm opacity-70">Chargement du tableau de bord…</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="ab2-card ab2-card-pad">
        <p className="ab2-empty text-sm text-red-300">Données indisponibles — vérifiez la connexion DB.</p>
      </div>
    );
  }

  const lastPub = overview.lastPublishedAt
    ? new Date(overview.lastPublishedAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const syncOk = overview.syncStatus === 'synced';
  const materialsOk = overview.materialsDraft === 0 && overview.materialsMissingPrice === 0;
  const stockOk = overview.stockRupture === 0 && overview.stockCritical === 0;
  const anomaliesOk = overview.anomaliesCritical === 0;
  const draftsTotal = overview.drafts + overview.materialsDraft;

  return (
    <div className="orion-overview-workspace">
      <header className="orion-overview-header">
        <div>
          <h1>Vue d&apos;ensemble</h1>
          <nav className="orion-overview-nav" aria-label="Accès directs Administration">
            <Link href="/administration/matieres">Stock &amp; Matières</Link>
            <Link href="/administration/catalogue-pos?studio=finitions">Finitions</Link>
            <Link href="/administration/production-flux">Production &amp; Flux</Link>
            <Link href="/administration/catalogue-pos">Catalogue POS</Link>
            <Link href="/administration/synchronisation">Sync</Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AppButton type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`inline h-3.5 w-3.5 mr-1${loading ? ' animate-spin' : ''}`} />
            Actualiser
          </AppButton>
          {canEdit ? (
            <>
              <AppButton type="button" variant="outline" size="sm" onClick={syncPos} disabled={syncing}>
                {syncing ? 'Sync…' : ADMIN_UI.syncPos}
              </AppButton>
              <AppButton type="button" variant="default" size="sm" onClick={publish} disabled={publishing}>
                {publishing ? '…' : ADMIN_UI.publish}
              </AppButton>
            </>
          ) : null}
        </div>
      </header>

      {/* Fusion DOMAINES CPS → même page (zéro suppression de la Vue d’ensemble Admin) */}
      <section className="orion-overview-cps-fuse" aria-label="Santé catalogue Prix et Stock">
        <CatalogueCockpitHost embedded />
      </section>

      <section className="orion-overview-health" aria-label="Santé publication">
        <span className="orion-overview-health-label">Publication</span>
        <HealthPill ok={draftsTotal === 0} label={draftsTotal === 0 ? 'Aucun brouillon' : `${draftsTotal} brouillon(s)`} />
        <HealthPill
          ok={anomaliesOk}
          label={anomaliesOk ? 'Anomalies OK' : `${overview.anomaliesCritical} critique(s)`}
        />
        <HealthPill
          ok={overview.unpublishedChanges === 0}
          label={
            overview.unpublishedChanges === 0
              ? 'Tout publié'
              : `${overview.unpublishedChanges} non publiée(s)`
          }
        />
        <HealthPill ok={syncOk} label={syncOk ? 'POS sync' : overview.syncMessage} />
        <HealthPill
          ok={stockOk}
          label={stockOk ? 'Stock OK' : `${overview.stockRupture} rupture`}
        />
      </section>

      {/* KPI Admin non dupliqués avec le cockpit catalogue (articles / matières / prix déjà au-dessus) */}
      <section className="orion-overview-kpi-grid" aria-label="Indicateurs Admin">
        <Kpi label="Profils actifs" value={overview.articlesActive} />
        <Kpi label="Visibles POS" value={overview.articlesVisiblePos} />
        <Kpi label="Brouillons" value={draftsTotal} tone={draftsTotal > 0 ? 'warning' : undefined} />
        <Kpi label="Non publiées" value={overview.unpublishedChanges} tone={overview.unpublishedChanges > 0 ? 'warning' : undefined} />
        <Kpi label="Critiques" value={overview.anomaliesCritical} tone={overview.anomaliesCritical > 0 ? 'danger' : undefined} />
        <Kpi label="Warnings" value={overview.anomaliesWarning} tone={overview.anomaliesWarning > 0 ? 'warning' : undefined} />
      </section>

      <p className="orion-overview-meta">
        Moteur {overview.engineVersion} · Dernière publication {lastPub}
        {overview.lastPublishedBy ? ` · ${overview.lastPublishedBy}` : ''}
        {!materialsOk ? ` · ${overview.materialsMissingPrice} prix matière manquant(s)` : ''}
      </p>

      <div className="orion-overview-row">
        <div className="orion-overview-panel">
          <h2>Alertes &amp; actions</h2>
          <div className="orion-overview-filters">
            {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`ab2-filter-chip${alertFilter === f ? ' is-active' : ''}`}
                onClick={() => setAlertFilter(f)}
              >
                {f === 'all' ? 'Toutes' : f === 'critical' ? 'Critiques' : f === 'warning' ? 'Warnings' : 'Infos'}
                {f !== 'all' && ` (${f === 'critical' ? alertCounts.critical : f === 'warning' ? alertCounts.warning : alertCounts.info})`}
              </button>
            ))}
          </div>
          {filteredAlerts.length === 0 ? (
            <p className="ab2-empty text-xs">Aucune alerte — système à jour.</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
              {filteredAlerts.map((a) => (
                <div key={a.id} className={`orion-overview-alert is-${a.level}`}>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-80" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-muted-foreground">{a.summary}</div>
                  </div>
                  {a.href ? (
                    <Link href={a.href} className="text-xs shrink-0 text-[var(--ab2-accent)] hover:underline">
                      Voir
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {anomalyPreview.length > 0 ? (
            <div className="orion-overview-anomaly-peek">
              <div className="orion-overview-panel-desc">
                Anomalies tarifaires — {anomalies?.critical ?? 0} critique(s) · {anomalies?.warning ?? 0} warning(s)
              </div>
              {anomalyPreview.slice(0, 4).map((a) => (
                <div key={a.id} className="orion-overview-anomaly">
                  <span className={`ab2-badge ${a.severity === 'critical' ? 'ab2-badge-danger' : a.severity === 'warning' ? 'ab2-badge-warning' : ''}`}>
                    {a.severity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate" title={a.message}>{a.message}</div>
                  </div>
                  <AppButton variant="outline" size="sm" className="shrink-0 orion-overview-link-btn" asChild>
                    <Link
                      href={
                        a.articleId
                          ? `/administration/catalogue-pos?studio=chips&article=${encodeURIComponent(a.articleId)}`
                          : bo('anomalies', 'audit')
                      }
                    >
                      Corriger
                    </Link>
                  </AppButton>
                </div>
              ))}
              <div className="orion-overview-footer-link">
                <Link href={bo('anomalies', 'audit')} className="text-xs text-[var(--ab2-accent)] hover:underline">
                  Toutes les anomalies →
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div className="orion-overview-panel">
          <h2>Activité récente</h2>
          <p className="orion-overview-panel-desc">Audit administrateur · {auditRows.length} dernière(s)</p>
          {auditRows.length === 0 ? (
            <p className="ab2-empty text-xs">Aucune activité récente.</p>
          ) : (
            <div className="orion-overview-table-wrap">
              <table className="orion-overview-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Utilisateur</th>
                    <th>Module</th>
                    <th>Action</th>
                    <th>Résumé</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.slice(0, 12).map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{r.userName ?? '—'}</td>
                      <td>{r.module}</td>
                      <td>{r.action}</td>
                      <td title={r.entityLabel ?? r.entityId ?? ''}>{r.entityLabel ?? r.entityId ?? r.entity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="orion-overview-footer-link">
            <Link href={bo('audit', 'audit')} className="text-xs text-[var(--ab2-accent)] hover:underline">
              Audit complet →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
