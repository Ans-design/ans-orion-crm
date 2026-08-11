'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Coins,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Stethoscope,
  Tags,
  TriangleAlert,
  Wand2,
  Workflow,
} from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { CpsStudioFrame } from './CpsStudioFrame';
import { KpiCards, type KpiId, type KpiItem } from './KpiCards';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  canEdit: boolean;
  kpiItems: KpiItem[];
  activeKpi: KpiId | null;
  onKpiSelect: (id: KpiId) => void;
  onOpenStudio: (studio: string, tab: string, view?: string) => void;
  priorities?: CockpitPriority[];
  syncStatus?: 'synced' | 'pending' | 'error';
  /** Intégré dans OverviewUnifiedWorkspace — pas de titre « Vue d’ensemble » dupliqué. */
  embedded?: boolean;
};

export type CockpitPriority = { id: string; label: string; count: number; href: string };

function priorityLevel(id: string, count: number): { label: string; className: string } {
  if (id === 'stock-low' || count > 20) {
    return { label: 'Bloquant', className: 'cps-prio-badge cps-prio-badge--danger' };
  }
  if (id === 'mat-price' || id === 'no-price' || count > 5) {
    return { label: 'Majeur', className: 'cps-prio-badge cps-prio-badge--warn' };
  }
  return { label: 'Mineur', className: 'cps-prio-badge cps-prio-badge--info' };
}

function parsePriorityHref(href: string): { studio: string; tab: string; view?: string } {
  let studio = 'prix';
  let tab = 'articles';
  let view: string | undefined;
  try {
    const u = new URL(href, 'http://local.cps');
    studio = u.searchParams.get('studio') ?? studio;
    tab = u.searchParams.get('tab') ?? tab;
    view = u.searchParams.get('view') ?? undefined;
  } catch {
    const match = href.match(/studio=([^&]+).*tab=([^&]+)/);
    studio = match?.[1] ?? studio;
    tab = match?.[2] ?? tab;
  }
  return { studio, tab, view };
}

function kpiValue(items: KpiItem[], id: KpiId): number {
  const raw = items.find((i) => i.id === id)?.value;
  if (typeof raw === 'number') return raw;
  const n = Number(String(raw ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Santé dérivée des KPI API (pas de données fictives). */
function buildHealth(items: KpiItem[]) {
  const articles = kpiValue(items, 'articles');
  const missing = kpiValue(items, 'missing-prices');
  const anomalies = kpiValue(items, 'anomalies');
  const doublons = kpiValue(items, 'doublons');
  const matieres = kpiValue(items, 'matieres');

  const catalogScore =
    articles <= 0 ? 40 : Math.max(35, Math.min(100, 100 - Math.round((anomalies / Math.max(articles, 1)) * 40)));
  const priceScore =
    matieres <= 0 ? 50 : Math.max(20, Math.min(100, 100 - Math.round((missing / Math.max(matieres, 1)) * 80)));
  const parityScore = Math.max(40, 100 - doublons * 15 - Math.min(anomalies, 40));

  return [
    {
      name: 'Catalogue articles',
      note: articles > 0 ? `${articles} article(s) POS` : 'Aucun article actif',
      value: catalogScore,
      color: catalogScore >= 80 ? 'var(--cps-success, #0c9f6e)' : 'var(--cps-warn, #d97706)',
    },
    {
      name: 'Prix matières',
      note: missing > 0 ? `${missing} prix manquant(s)` : 'Tous les prix renseignés',
      value: priceScore,
      color: priceScore >= 80 ? 'var(--cps-success, #0c9f6e)' : 'var(--cps-danger, #dc284e)',
    },
    {
      name: 'Parité Admin ↔ POS',
      note: doublons > 0 ? `${doublons} doublon(s)` : 'Pas de doublon détecté',
      value: parityScore,
      color: parityScore >= 85 ? 'var(--cps-success, #0c9f6e)' : 'var(--cps-warn, #d97706)',
    },
  ];
}

/**
 * Cockpit premium (maquette V5/V6) — données API réelles.
 * Hébergé sur `/administration/vue-ensemble` (sidebar Macro).
 * DOMAINES CPS : entrée masquée (alias studio=cockpit conservé → redirect).
 */
export function CockpitStudio({
  canEdit,
  kpiItems,
  activeKpi,
  onKpiSelect,
  onOpenStudio,
  priorities = [],
  syncStatus = 'pending',
  embedded = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showGate, setShowGate] = useState(false);

  const health = buildHealth(kpiItems);
  const healthAvg = Math.round(health.reduce((s, h) => s + h.value, 0) / Math.max(health.length, 1));
  const blocking = priorities.filter((p) => priorityLevel(p.id, p.count).label === 'Bloquant').length;

  async function migrate() {
    if (!canEdit) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/base-prix-matieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error?.message ?? json.error ?? 'Migration impossible');
      const m = `Migration OK — ISF ${json.data?.smallFormatPrices ?? '—'}, GF ${json.data?.grandFormatPrices ?? '—'}, drifts ${json.data?.drifts?.length ?? 0}`;
      setMsg(m);
      uxToast.success(m);
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Erreur migration';
      setMsg(err);
      uxToast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function rebuild() {
    if (!canEdit) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/base-prix-matieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rebuild' }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error?.message ?? 'Rebuild impossible');
      uxToast.success('Index POS reconstruit');
      setMsg('Index POS reconstruit');
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Rebuild impossible');
    } finally {
      setBusy(false);
    }
  }

  const syncSteps = [
    {
      id: 'catalog',
      name: 'Catalogue & profils',
      note: syncStatus === 'synced' ? 'Dernière sync OK' : 'À vérifier avant prod',
      status: syncStatus === 'error' ? 'fail' : syncStatus === 'synced' ? 'ok' : 'warn',
    },
    {
      id: 'materials',
      name: 'Matières & prix',
      note: `${kpiValue(kpiItems, 'missing-prices')} prix manquant(s)`,
      status: kpiValue(kpiItems, 'missing-prices') > 0 ? 'warn' : 'ok',
    },
    {
      id: 'parity',
      name: 'Parité & anomalies',
      note: `${kpiValue(kpiItems, 'anomalies')} anomalie(s)`,
      status: kpiValue(kpiItems, 'anomalies') > 50 ? 'fail' : kpiValue(kpiItems, 'anomalies') > 0 ? 'warn' : 'ok',
    },
  ] as const;

  return (
    <div className={cn('cps-cockpit-premium space-y-3', embedded && 'cps-cockpit-premium--embedded')}>
      {/* Garde-fou production — compacté en mode embarqué (détail à la demande) */}
      {embedded ? (
        <button
          type="button"
          className="cps-audit-gate cps-audit-gate--compact"
          aria-expanded={showGate}
          onClick={() => setShowGate((v) => !v)}
        >
          <span className="cps-audit-gate__title">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Prod verrouillée · backup requis
          </span>
          <span className="cps-audit-gate__badges cps-audit-gate__badges--compact">
            <span className="cps-gate-badge cps-gate-badge--danger">D-01</span>
            <span className="cps-gate-badge cps-gate-badge--danger">M-02</span>
            <span className="cps-gate-badge cps-gate-badge--warn">D-02</span>
            <span className="cps-gate-badge cps-gate-badge--warn">S-01</span>
          </span>
          {showGate ? (
            <p className="cps-audit-gate__copy">
              GO local · GO staging conditionnel · NO-GO production. Aucune sync prod ni migration
              destructive tant que D-01 (backup) n’est pas levé.
            </p>
          ) : null}
        </button>
      ) : (
        <div className="cps-audit-gate" role="status">
          <div className="cps-audit-gate__body">
            <div className="cps-audit-gate__title">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Production verrouillée — backup PostgreSQL requis
            </div>
            <p className="cps-audit-gate__copy">
              GO local · GO staging conditionnel · NO-GO production. Aucune sync prod ni migration destructive
              tant que D-01 (backup) n’est pas levé.
            </p>
          </div>
          <div className="cps-audit-gate__badges">
            <span className="cps-gate-badge cps-gate-badge--danger">D-01 Backup</span>
            <span className="cps-gate-badge cps-gate-badge--danger">M-02 Paiements</span>
            <span className="cps-gate-badge cps-gate-badge--warn">D-02 Prisma</span>
            <span className="cps-gate-badge cps-gate-badge--warn">S-01 Sync</span>
          </div>
        </div>
      )}

      {/* Bandeau route — masqué si déjà dans Vue d’ensemble Admin (évite le bruit) */}
      {!embedded ? (
        <div className="cps-project-strip" aria-label="Références projet">
          <div className="cps-project-strip__route">
            <strong>Hub canonique</strong>
            <code>/administration/catalogue-prix-stock</code>
          </div>
          <div className="cps-project-strip__fact">
            <strong>Navigation</strong>
            <span>3 domaines · alias conservés</span>
          </div>
          <div className="cps-project-strip__fact">
            <strong>Priorités</strong>
            <span>
              {priorities.length} file · {blocking} bloquant{blocking > 1 ? 's' : ''}
            </span>
          </div>
          <div className="cps-project-strip__fact">
            <strong>Santé</strong>
            <span>Score {healthAvg}/100</span>
          </div>
        </div>
      ) : null}

      <div className="cps-cockpit-heading">
        <div>
          {!embedded ? (
            <p className="cps-cockpit-heading__eyebrow">Cockpit · données API live</p>
          ) : null}
          <h2 className="cps-cockpit-heading__title">
            {embedded ? 'Catalogue & POS' : 'Vue d’ensemble'}
            <span
              className={cn(
                'cps-badge-score ml-2 align-middle',
                healthAvg >= 80 ? 'cps-badge-score--ok' : healthAvg >= 60 ? 'cps-badge-score--warn' : 'cps-badge-score--danger',
              )}
            >
              {healthAvg}/100
            </span>
          </h2>
          {!embedded ? (
            <p className="cps-cockpit-heading__sub">
              Santé du catalogue, priorités administratives et parité commerciale.
            </p>
          ) : (
            <p className="cps-cockpit-heading__sub">
              {priorities.length} priorité{priorities.length > 1 ? 's' : ''}
              {blocking > 0 ? ` · ${blocking} bloquante${blocking > 1 ? 's' : ''}` : ''}
            </p>
          )}
        </div>
        <div className="cps-cockpit-heading__actions">
          <AppButton
            type="button"
            size="sm"
            variant="outline"
            className="h-8 min-h-8 max-h-8"
            onClick={() => onOpenStudio('excel', 'anomalies')}
          >
            <Stethoscope className="h-3.5 w-3.5" />
            Diagnostic
          </AppButton>
          <AppButton
            type="button"
            size="sm"
            variant="default"
            className="h-8 min-h-8 max-h-8"
            onClick={() => onOpenStudio('prix', 'articles')}
          >
            Studio Prix
            <ArrowRight className="h-3.5 w-3.5" />
          </AppButton>
        </div>
      </div>

      <KpiCards items={kpiItems} activeId={activeKpi} onSelect={onKpiSelect} />

      <div className="cps-cockpit-grid-2">
        <CpsStudioFrame
          title="Santé des données"
          subtitle={embedded ? undefined : 'Publication validée si catalogue et matières cohérents.'}
        >
          <div className="cps-health-list">
            {health.map((h) => (
              <div key={h.name} className="cps-health-row">
                <div className="cps-health-row__meta">
                  <div className="cps-health-row__name">{h.name}</div>
                  <div className="cps-health-row__note">{h.note}</div>
                </div>
                <div className="cps-health-progress" aria-hidden>
                  <span style={{ width: `${h.value}%`, background: h.color }} />
                </div>
                <strong className="cps-health-row__pct" style={{ color: h.color }}>
                  {h.value}%
                </strong>
              </div>
            ))}
          </div>
        </CpsStudioFrame>

        <CpsStudioFrame
          title="Synchronisation"
          subtitle={
            embedded
              ? undefined
              : syncStatus === 'synced'
                ? 'Dernière sync OK'
                : syncStatus === 'error'
                  ? 'Erreur — POS potentiellement non à jour'
                  : 'Sync non vérifiée — contrôler avant staging'
          }
        >
          <div className="cps-sync-steps">
            {syncSteps.map((s) => (
              <div key={s.id} className="cps-sync-step">
                <span
                  className={cn(
                    'cps-sync-step__icon',
                    s.status === 'ok' && 'is-ok',
                    s.status === 'warn' && 'is-warn',
                    s.status === 'fail' && 'is-fail',
                  )}
                >
                  {s.status === 'ok' ? (
                    <RefreshCw className="h-3.5 w-3.5" />
                  ) : (
                    <TriangleAlert className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="cps-sync-step__title">{s.name}</div>
                  <div className="cps-sync-step__note">{s.note}</div>
                </div>
                <span
                  className={cn(
                    'cps-prio-badge',
                    s.status === 'ok' && 'cps-prio-badge--ok',
                    s.status === 'warn' && 'cps-prio-badge--warn',
                    s.status === 'fail' && 'cps-prio-badge--danger',
                  )}
                >
                  {s.status === 'ok' ? 'OK' : s.status === 'warn' ? 'À vérifier' : 'Échec'}
                </span>
              </div>
            ))}
          </div>
          <AppButton
            type="button"
            variant="outline"
            className="mt-3 w-full justify-center"
            onClick={() => onOpenStudio('excel', 'anomalies')}
          >
            Voir diagnostics
          </AppButton>
        </CpsStudioFrame>
      </div>

      {/* Priorités (+ accès rapides hors mode embarqué — déjà couverts par la nav Admin) */}
      <div className={embedded ? undefined : 'cps-cockpit-grid-2'}>
        <CpsStudioFrame
          title="File des priorités"
          subtitle={embedded ? undefined : 'Triées par impact — ouvre le domaine concerné.'}
          toolbar={
            <AppButton
              type="button"
              variant="outline"
              className="text-xs"
              onClick={() => onOpenStudio('excel', 'anomalies')}
            >
              Tout
            </AppButton>
          }
        >
          {priorities.length > 0 ? (
            <div className="cps-prio-table-wrap">
              <table className="cps-prio-table">
                <thead>
                  <tr>
                    <th>Niveau</th>
                    <th>Objet</th>
                    <th>Anomalie</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {priorities.slice(0, embedded ? 4 : 6).map((p) => {
                    const { studio, tab, view } = parsePriorityHref(p.href);
                    const level = priorityLevel(p.id, p.count);
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className={level.className}>{level.label}</span>
                        </td>
                        <td>{p.label}</td>
                        <td>
                          {p.count.toLocaleString('fr-FR')} élément{p.count > 1 ? 's' : ''}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="cps-prio-action"
                            onClick={() => onOpenStudio(studio, tab, view)}
                          >
                            Ouvrir
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="m-0 text-sm text-[var(--cps-muted)]">
              Aucune priorité critique — catalogue stable.
            </p>
          )}
        </CpsStudioFrame>

        {!embedded ? (
          <CpsStudioFrame title="Accès rapides" subtitle="Opérations fréquentes.">
            <div className="cps-quick-grid">
              <button type="button" className="cps-quick-card" onClick={() => onOpenStudio('prix', 'articles')}>
                <span className="cps-quick-card__icon is-red">
                  <Tags className="h-4 w-4" />
                </span>
                <span className="cps-quick-card__title">Tarifs</span>
                <span className="cps-quick-card__note">Prix individuel ou groupé</span>
                <ArrowRight className="cps-quick-card__arrow" aria-hidden />
              </button>
              <button type="button" className="cps-quick-card" onClick={() => onOpenStudio('matieres', 'matieres', 'couts')}>
                <span className="cps-quick-card__icon is-amber">
                  <Coins className="h-4 w-4" />
                </span>
                <span className="cps-quick-card__title">Matières</span>
                <span className="cps-quick-card__note">Coûts & prix manquants</span>
                <ArrowRight className="cps-quick-card__arrow" aria-hidden />
              </button>
              <button type="button" className="cps-quick-card" onClick={() => onOpenStudio('prix', 'regles')}>
                <span className="cps-quick-card__icon is-indigo">
                  <Workflow className="h-4 w-4" />
                </span>
                <span className="cps-quick-card__title">Formules</span>
                <span className="cps-quick-card__note">Règles de calcul</span>
                <ArrowRight className="cps-quick-card__arrow" aria-hidden />
              </button>
              <button type="button" className="cps-quick-card" onClick={() => onOpenStudio('excel', 'excel')}>
                <span className="cps-quick-card__icon is-cyan">
                  <FileSpreadsheet className="h-4 w-4" />
                </span>
                <span className="cps-quick-card__title">Import Excel</span>
                <span className="cps-quick-card__note">Prévisualisation</span>
                <ArrowRight className="cps-quick-card__arrow" aria-hidden />
              </button>
            </div>
          </CpsStudioFrame>
        ) : null}
      </div>

      {canEdit && !embedded ? (
        <div className="cps-maintenance-bar">
          <AppButton
            type="button"
            variant="outline"
            className="text-xs"
            aria-expanded={showMaintenance}
            onClick={() => setShowMaintenance((v) => !v)}
          >
            Maintenance technique
          </AppButton>
          {showMaintenance ? (
            <div className="flex flex-wrap gap-1.5">
              <AppButton type="button" variant="default" disabled={busy} onClick={() => void migrate()}>
                <Wand2 className="h-3.5 w-3.5" />
                Migrer source unique
              </AppButton>
              <AppButton type="button" variant="outline" disabled={busy} onClick={() => void rebuild()}>
                <RefreshCw className={busy ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                Rebuild index POS
              </AppButton>
            </div>
          ) : null}
          {msg ? <p className="m-0 text-[11px] text-[var(--cps-muted)]">{msg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
