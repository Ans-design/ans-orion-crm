'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import {
  stepToExcelRow,
  transitionToExcelRow,
  ruleToExcelRow,
  validateProductionFluxExcelRows,
} from '@/lib/backoffice/production-flux-excel-format';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import type { ProductionFluxStep } from '@/lib/data/production-flux-config';
import type { ProductionFluxPayload } from '@/lib/services/production-flux-service';
import { ProductionFluxActionsMenu } from './ProductionFluxActionsMenu';
import { ProductionFluxStepModal } from './ProductionFluxStepModal';
import './production-flux.css';

type Props = { canEdit: boolean };

export function ProductionFluxUnifiedWorkspace({ canEdit }: Props) {
  const [data, setData] = useState<ProductionFluxPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ProductionFluxStep | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteStepConfirm, setDeleteStepConfirm] = useState<ProductionFluxStep | null>(null);
  const [transitionQuery, setTransitionQuery] = useState('');
  const [transitionQueryDebounced, setTransitionQueryDebounced] = useState('');
  const [transitionModeFilter, setTransitionModeFilter] = useState<'all' | 'manual' | 'auto'>('all');
  const [sideTab, setSideTab] = useState<'rules' | 'health'>('rules');

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/production-flux', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setData(d.data as ProductionFluxPayload);
      setSelectedStepId((prev) => {
        const steps = (d.data as ProductionFluxPayload).steps;
        if (prev && steps.some((s) => s.id === prev)) return prev;
        return steps[0]?.id ?? null;
      });
    } catch (e) {
      if (!opts?.silent) uxToast.error(e instanceof Error ? e.message : 'Erreur chargement');
      throw e;
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => setTransitionQueryDebounced(transitionQuery), 180);
    return () => window.clearTimeout(t);
  }, [transitionQuery]);

  const selectedStep = useMemo(
    () => data?.steps.find((s) => s.id === selectedStepId) ?? null,
    [data, selectedStepId],
  );

  const maxSortOrder = useMemo(
    () => data?.steps.reduce((m, s) => Math.max(m, s.sortOrder), 0) ?? 0,
    [data],
  );

  const filteredTransitions = useMemo(() => {
    if (!data) return [];
    const q = transitionQueryDebounced.trim().toLowerCase();
    return data.transitions.filter((t) => {
      if (transitionModeFilter !== 'all' && t.mode !== transitionModeFilter) return false;
      if (!q) return true;
      return `${t.fromName} ${t.toName} ${t.condition} ${t.label}`.toLowerCase().includes(q);
    });
  }, [data, transitionQueryDebounced, transitionModeFilter]);

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin-backoffice/production-flux/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Action impossible');

      if (action === 'simulate') {
        const { path, blockers } = d.data as { path: string[]; blockers: string[] };
        uxToast.success(
          `Simulation : ${path.join(' → ')}${blockers.length ? ` (${blockers.length} alerte(s))` : ''}`,
        );
      } else if (action === 'sync-tasks') {
        uxToast.success(`${d.data.created} tâche(s) synchronisée(s)`);
      } else if (action === 'sync-planning') {
        uxToast.success(`${d.data.created} créneau(x) planning créé(s)`);
      } else if (action === 'reset') {
        uxToast.success('Configuration réinitialisée');
      } else if (action === 'export') {
        const blob = new Blob([JSON.stringify(d.data.config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `production-flux-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        uxToast.success('Configuration exportée');
      }
      await load({ silent: true });
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur action');
    } finally {
      setBusy(false);
    }
  };

  const saveStep = async (
    step: ProductionFluxStep,
    mode: 'draft' | 'active',
    extras?: { linkFromStepId?: string | null; transitionMode?: 'manual' | 'auto' },
  ) => {
    setBusy(true);
    try {
      const payload = { ...step, active: mode === 'active' ? true : step.active };
      const r = await fetch('/api/admin-backoffice/production-flux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'step',
          data: payload,
          linkFromStepId: extras?.linkFromStepId ?? null,
          transitionMode: extras?.transitionMode ?? 'manual',
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Enregistrement impossible');
      uxToast.success(
        mode === 'active'
          ? extras?.linkFromStepId
            ? 'Étape + transition synchronisées'
            : 'Étape enregistrée'
          : 'Brouillon enregistré',
      );
      setStepModalOpen(false);
      setEditingStep(null);
      setSelectedStepId(step.id);
      await load({ silent: true });
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setBusy(false);
    }
  };

  const deleteStep = async (step: ProductionFluxStep) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin-backoffice/production-flux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delete-step', stepId: step.id }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Suppression impossible');
      uxToast.success(`Étape « ${step.name} » supprimée · transitions nettoyées`);
      setDeleteStepConfirm(null);
      setStepModalOpen(false);
      setEditingStep(null);
      setSelectedStepId((prev) => (prev === step.id ? null : prev));
      await load({ silent: true });
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur suppression');
    } finally {
      setBusy(false);
    }
  };

  const toggleTransition = async (id: string, active: boolean) => {
    if (!canEdit || !data || busy) return;
    const t = data.transitions.find((x) => x.id === id);
    if (!t) return;
    const nextActive = !active;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        transitions: prev.transitions.map((x) => (x.id === id ? { ...x, active: nextActive } : x)),
        kpis: {
          ...prev.kpis,
          activeTransitions: prev.transitions.filter((x) => (x.id === id ? nextActive : x.active)).length,
        },
      };
    });
    try {
      const r = await fetch('/api/admin-backoffice/production-flux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'transition', data: { ...t, active: nextActive } }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Mise à jour impossible');
      void load({ silent: true });
    } catch (e) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          transitions: prev.transitions.map((x) => (x.id === id ? { ...x, active } : x)),
        };
      });
      uxToast.error(e instanceof Error ? e.message : 'Erreur transition');
    }
  };

  const toggleRule = async (id: string, active: boolean) => {
    if (!canEdit || !data || busy) return;
    const rule = data.rules.find((x) => x.id === id);
    if (!rule) return;
    const nextActive = !active;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map((x) => (x.id === id ? { ...x, active: nextActive } : x)),
      };
    });
    try {
      const r = await fetch('/api/admin-backoffice/production-flux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rule', data: { ...rule, active: nextActive } }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Mise à jour impossible');
      void load({ silent: true });
    } catch (e) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rules: prev.rules.map((x) => (x.id === id ? { ...x, active } : x)),
        };
      });
      uxToast.error(e instanceof Error ? e.message : 'Erreur règle');
    }
  };

  const importFluxRows = async (rows: Record<string, unknown>[]) => {
    const r = await fetch('/api/admin-backoffice/production-flux/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
    await load({ silent: true });
    return d.data;
  };

  if (loading && !data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Chargement Production &amp; Flux…</div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">Données indisponibles</p>
        <button type="button" className="pf-btn-ghost" onClick={() => void load()}>Réessayer</button>
      </div>
    );
  }

  const roleLabel = (id: string) => ROLE_LABELS[id] ?? id;
  const activeRulesCount = data.rules.filter((r) => r.active).length;
  const autoTransitionsCount = data.transitions.filter((t) => t.active && t.mode === 'auto').length;
  const anomalyErrors = data.anomalies.filter((a) => a.level === 'error').length;

  const delayForTransition = (toStepId: string) => {
    const h = data.steps.find((s) => s.id === toStepId)?.targetDelayHours;
    if (h == null || h <= 0) return 'Immédiat';
    return `${h} h`;
  };

  const openStep = (step: ProductionFluxStep | null) => {
    setEditingStep(step);
    setStepModalOpen(true);
  };

  return (
    <div className="pf-shell pf-shell--lean is-dense space-y-2.5 min-h-0 flex flex-col">
      <header className="pf-heading">
        <div>
          <p className="pf-eyebrow">Paramètres · Production</p>
          <h1>Production &amp; flux</h1>
          <p className="sub">Étapes, transitions et règles — une seule chaîne synchronisée.</p>
        </div>
        <div className="pf-heading-actions">
          {canEdit ? (
            <button type="button" className="pf-btn-primary" onClick={() => openStep(null)}>
              <Plus className="h-4 w-4" />
              Nouvelle étape
            </button>
          ) : null}
          <button
            type="button"
            className="pf-btn-ghost"
            onClick={() => {
              void load({ silent: true })
                .then(() => uxToast.success('Synchronisé'))
                .catch((e) => uxToast.error(e instanceof Error ? e.message : 'Sync impossible'));
            }}
            disabled={busy || loading}
          >
            <RefreshCw className={`h-4 w-4${loading ? ' animate-spin' : ''}`} />
            Sync
          </button>
          <ExcelTableActions
            fileStem="production-flux"
            sheetName="Étapes"
            validateRows={validateProductionFluxExcelRows}
            canImport={canEdit}
            getExportRows={() => [
              ...data.steps.map((s) => stepToExcelRow(s)),
              ...data.transitions.map((t) => transitionToExcelRow(t)),
              ...data.rules.map((r) => ruleToExcelRow(r)),
            ]}
            onImportRows={importFluxRows}
          />
          <ProductionFluxActionsMenu
            canEdit={canEdit}
            busy={busy}
            onSyncTasks={() => void runAction('sync-tasks')}
            onSyncPlanning={() => void runAction('sync-planning')}
            onSimulate={() => void runAction('simulate')}
            onReset={() => setResetConfirmOpen(true)}
            onExport={() => void runAction('export')}
            onShowAnomalies={() => setSideTab('health')}
          />
        </div>
      </header>

      <div className="pf-pillbar" aria-label="Indicateurs">
        <span><b>{data.kpis.activeSteps}</b> étapes</span>
        <span><b>{data.kpis.activeTransitions}</b> transitions</span>
        <span><b>{activeRulesCount}</b> règles</span>
        <span><b>{autoTransitionsCount}</b> auto</span>
        {data.anomalies.length > 0 ? (
          <button type="button" className="pf-pillbar-alert" onClick={() => setSideTab('health')}>
            {anomalyErrors > 0 ? `${anomalyErrors} erreur(s)` : `${data.anomalies.length} alerte(s)`}
          </button>
        ) : (
          <span className="is-ok">Flux OK</span>
        )}
      </div>

      <section className="pf-card pf-flow">
        <div className="pf-section-head">
          <div>
            <h2>Chaîne de production</h2>
            <p>
              {data.steps.length} étapes
              {selectedStep ? ` · sélection : ${selectedStep.name}` : ''}
            </p>
          </div>
          {selectedStep && canEdit ? (
            <div className="flex items-center gap-2">
              <button type="button" className="pf-btn-ghost pf-btn-sm" onClick={() => openStep(selectedStep)}>
                Modifier
              </button>
              <button
                type="button"
                className="pf-btn-ghost pf-btn-sm pf-btn-danger"
                disabled={busy}
                onClick={() => setDeleteStepConfirm(selectedStep)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
        <div className="pf-steps">
          {data.steps.map((step, i) => (
            <div key={step.id} className="pf-step-wrap">
              <div className={`pf-step-shell${selectedStepId === step.id ? ' is-current' : ''}`}>
                <button
                  type="button"
                  className={`pf-step${selectedStepId === step.id ? ' is-current' : ''}${!step.active ? ' is-inactive' : ''}`}
                  onClick={() => setSelectedStepId(step.id)}
                  onDoubleClick={() => canEdit && openStep(step)}
                  title={step.description || step.name}
                >
                  <i>{i + 1}</i>
                  <span>
                    <b>{step.name}</b>
                    <em>{roleLabel(step.responsibleRole)}</em>
                  </span>
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    className="pf-step-delete"
                    title={`Supprimer « ${step.name} »`}
                    aria-label={`Supprimer ${step.name}`}
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStepId(step.id);
                      setDeleteStepConfirm(step);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
              {i < data.steps.length - 1 ? <span className="pf-arrow" aria-hidden>→</span> : null}
            </div>
          ))}
        </div>
      </section>

      <div className="pf-main-grid">
        <section className="pf-card">
          <div className="pf-toolbar">
            <div className="pf-title">
              <h2>Transitions</h2>
              <span>{filteredTransitions.length}</span>
            </div>
            <div className="pf-controls">
              <label className="pf-search">
                <span aria-hidden>⌕</span>
                <input
                  value={transitionQuery}
                  onChange={(e) => setTransitionQuery(e.target.value)}
                  placeholder="Rechercher…"
                  aria-label="Rechercher une transition"
                />
              </label>
              <select
                value={transitionModeFilter}
                onChange={(e) => setTransitionModeFilter(e.target.value as 'all' | 'manual' | 'auto')}
                aria-label="Filtrer par mode"
              >
                <option value="all">Tous</option>
                <option value="manual">Manuel</option>
                <option value="auto">Automatique</option>
              </select>
            </div>
          </div>
          <div className="pf-scroll">
            {filteredTransitions.length === 0 ? (
              <div className="pf-empty">
                <b>Aucune transition</b>
                <br />
                Ajoutez une étape pour créer le lien automatiquement.
              </div>
            ) : (
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>De</th>
                    <th>Vers</th>
                    <th>Mode</th>
                    <th>Délai</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransitions.map((t) => (
                    <tr key={t.id} className={!t.active ? 'is-dim' : undefined}>
                      <td>
                        <span className="pf-dot" aria-hidden />
                        <b>{t.fromName}</b>
                      </td>
                      <td>→ <b>{t.toName}</b></td>
                      <td>
                        <span className={`pf-badge-mode ${t.mode === 'auto' ? 'is-auto' : 'is-manual'}`}>
                          {t.mode === 'auto' ? '⚡ Auto' : '◷ Manuel'}
                        </span>
                      </td>
                      <td>{delayForTransition(t.toStepId)}</td>
                      <td>
                        <button
                          type="button"
                          className={`pf-switch${t.active ? ' is-on' : ''}`}
                          disabled={!canEdit}
                          aria-pressed={t.active}
                          aria-label={t.active ? 'Désactiver' : 'Activer'}
                          title={t.condition || t.label}
                          onClick={() => void toggleTransition(t.id, t.active)}
                        >
                          <i />
                        </button>
                        <span className="pf-status">{t.active ? 'Active' : 'Off'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="pf-card pf-side-card">
          <div className="pf-side-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={sideTab === 'rules'}
              className={sideTab === 'rules' ? 'is-active' : undefined}
              onClick={() => setSideTab('rules')}
            >
              Règles ({activeRulesCount}/{data.rules.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sideTab === 'health'}
              className={sideTab === 'health' ? 'is-active' : undefined}
              onClick={() => setSideTab('health')}
            >
              Santé
              {data.anomalies.length > 0 ? ` (${data.anomalies.length})` : ''}
            </button>
          </div>

          {sideTab === 'rules' ? (
            <div className="pf-scroll pf-side-body">
              {data.rules.length === 0 ? (
                <div className="pf-empty">Aucune règle métier.</div>
              ) : (
                <ul className="pf-rule-list">
                  {data.rules.map((r) => (
                    <li key={r.id} className={!r.active ? 'is-dim' : undefined}>
                      <div className="min-w-0">
                        <b>{r.name}</b>
                        <em>{r.condition}</em>
                      </div>
                      <span className={`pf-badge ${r.level === 'blocking' ? 'pf-badge-block' : r.level === 'warning' ? 'pf-badge-warn' : 'pf-badge-muted'}`}>
                        {r.level}
                      </span>
                      <button
                        type="button"
                        className={`pf-switch${r.active ? ' is-on' : ''}`}
                        disabled={!canEdit}
                        aria-pressed={r.active}
                        aria-label={r.active ? `Désactiver ${r.name}` : `Activer ${r.name}`}
                        onClick={() => void toggleRule(r.id, r.active)}
                      >
                        <i />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="pf-side-body space-y-3">
              <div className="pf-health-kpis">
                <span>{data.kpis.tasksSynced} tâches sync</span>
                <span>{data.kpis.planningSynced} créneaux</span>
              </div>
              {data.anomalies.length === 0 ? (
                <p className="text-sm m-0" style={{ color: 'var(--pf-muted)' }}>Aucune anomalie — flux cohérent.</p>
              ) : (
                <div className="pf-anomaly-list">
                  {data.anomalies.map((a) => (
                    <div key={a.id} className={`pf-anomaly-item ${a.level === 'error' ? 'is-error' : 'is-warning'}`}>
                      {a.message}
                    </div>
                  ))}
                </div>
              )}
              {data.syncJournal[0] ? (
                <p className="pf-last-sync">
                  Dernière sync : {new Date(data.syncJournal[0].at).toLocaleString('fr-FR')} — {data.syncJournal[0].summary}
                </p>
              ) : null}
              {data.history[0] ? (
                <p className="pf-last-sync">
                  Dernière modif : {data.history[0].action}
                  {(data.history[0].newValue as { name?: string } | null)?.name
                    ? ` · ${(data.history[0].newValue as { name?: string }).name}`
                    : ''}
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <ProductionFluxStepModal
        open={stepModalOpen}
        initial={editingStep}
        roles={data.roles}
        steps={data.steps}
        maxSortOrder={maxSortOrder}
        onClose={() => { setStepModalOpen(false); setEditingStep(null); }}
        onSave={(step, mode, extras) => void saveStep(step, mode, extras)}
        onDelete={(step) => {
          setStepModalOpen(false);
          setDeleteStepConfirm(step);
        }}
        saving={busy}
      />
      <ConfirmDialog
        open={Boolean(deleteStepConfirm)}
        onOpenChange={(open) => { if (!open) setDeleteStepConfirm(null); }}
        title={deleteStepConfirm ? `Supprimer « ${deleteStepConfirm.name} » ?` : 'Supprimer l’étape ?'}
        description="L’étape et ses transitions sont retirées ; les voisins sont reconnectés. Réinitialiser restaure le flux par défaut."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          if (deleteStepConfirm) void deleteStep(deleteStepConfirm);
        }}
      />
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Réinitialiser la configuration workflow ?"
        description="Toute la configuration workflow sera remise aux valeurs par défaut."
        confirmLabel="Réinitialiser"
        variant="destructive"
        onConfirm={() => {
          setResetConfirmOpen(false);
          void runAction('reset');
        }}
      />
    </div>
  );
}
