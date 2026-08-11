'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { CheckCircle2, ChevronRight, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { COMMANDE_WORKFLOW_JALONS } from '@/lib/workflow/commande-workflow';
import { CommandeWorkflowActions } from '@/components/commandes/commande-workflow-actions';
import { liveFetch, emitOrionLive } from '@/lib/live/orion-live';

type WorkflowSnapshot = {
  currentJalon: { id: string; label: string; avancement: number };
  nextJalon: { id: string; label: string; avancement: number } | null;
  blockers: string[];
  progressPercent: number;
};

type Props = {
  commandeId: string;
  workflow: { snapshot: WorkflowSnapshot } | null;
  onUpdated: () => void;
};

function canForceWorkflow(role?: string): boolean {
  return role === 'admin' || role === 'manager';
}

export function CommandeWorkflowStepper({ commandeId, workflow, onUpdated }: Props) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const mayForce = canForceWorkflow(role);
  const [loading, setLoading] = useState(false);
  const snapshot = workflow?.snapshot;
  if (!snapshot) return null;

  const postWorkflow = async (body: Record<string, unknown>) => {
    const r = await liveFetch(`/api/commandes/${commandeId}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      uxToast.error(getApiErrorMessage(d, 'Impossible d\'avancer le workflow'));
      return false;
    }
    emitOrionLive('commandes', { entityId: commandeId, source: 'workflow' });
    emitOrionLive('production', { entityId: commandeId, source: 'workflow', skipNav: true });
    return d;
  };

  const advance = async (force = false) => {
    if (!snapshot.nextJalon) return;
    setLoading(true);
    try {
      const d = await postWorkflow({
        type: 'jalon',
        jalonId: snapshot.nextJalon.id,
        ...(force ? { force: true } : {}),
      });
      if (!d) return;
      uxToast.success(`Jalon « ${snapshot.nextJalon.label} » atteint`, { icon: '✓' });
      onUpdated();
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const bootstrap = async () => {
    setLoading(true);
    try {
      const ok = await postWorkflow({ type: 'bootstrap' });
      if (!ok) return;
      uxToast.success('Tâches et dossiers synchronisés');
      onUpdated();
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const hasBlockers = snapshot.blockers.length > 0;

  return (
    <div className="dashboard-chart-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-sm">Workflow commande</h3>
        <span className="text-xs text-muted-foreground">{snapshot.progressPercent} %</span>
      </div>

      <div className="h-2 rounded-full bg-muted mb-4 overflow-hidden">
        <div
          className="h-full bg-[var(--ans-blue)] transition-all"
          style={{ width: `${snapshot.progressPercent}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {COMMANDE_WORKFLOW_JALONS.map((j) => {
          const done = snapshot.progressPercent >= j.avancement;
          const current = snapshot.currentJalon.id === j.id;
          return (
            <span
              key={j.id}
              title={j.label}
              className={`px-2 py-0.5 rounded text-[9px] font-medium border ${
                current
                  ? 'border-[var(--ans-blue)] bg-[var(--ans-blue)]/10 text-[var(--ans-blue)]'
                  : done
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                    : 'border-border text-muted-foreground'
              }`}
            >
              {done && !current ? '✓ ' : ''}{j.label}
            </span>
          );
        })}
      </div>

      {hasBlockers && (
        <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200">
          <p className="font-semibold flex items-center gap-1 mb-1">
            <AlertTriangle size={12} /> Points à traiter avant la suite
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {snapshot.blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      )}

      <CommandeWorkflowActions
        commandeId={commandeId}
        blockers={snapshot.blockers}
        nextJalonLabel={snapshot.nextJalon?.label}
      />

      <div className="flex flex-wrap gap-2">
        {snapshot.nextJalon && (
          <button
            type="button"
            disabled={loading || (hasBlockers && !mayForce)}
            onClick={() => advance(false)}
            className="btn btn-b btn-sm flex items-center gap-1 disabled:opacity-50"
            title={hasBlockers ? 'Résolvez les points bloquants ou utilisez l\'override direction' : undefined}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
            Jalon suivant : {snapshot.nextJalon.label}
          </button>
        )}
        {snapshot.nextJalon && hasBlockers && mayForce && (
          <button
            type="button"
            disabled={loading}
            onClick={() => advance(true)}
            className="btn btn-out btn-sm flex items-center gap-1 text-amber-700 border-amber-500/40"
          >
            <Shield size={14} />
            Override direction
          </button>
        )}
        {!snapshot.nextJalon && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={14} /> Parcours terminé
          </span>
        )}
        {snapshot.blockers.some((b) => b.includes('synchronis') || b.includes('GPAO')) && (
          <button type="button" disabled={loading} onClick={bootstrap} className="btn btn-out btn-sm text-xs">
            Synchroniser dossiers
          </button>
        )}
      </div>
    </div>
  );
}
