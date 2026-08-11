'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { Factory, ChevronRight, Shield, Loader2 } from 'lucide-react';
import {
  COMMANDE_WORKFLOW_JALONS,
  resolveWorkflowJalonIndex,
} from '@/lib/workflow/commande-workflow';
import { CommandeWorkflowActions } from '@/components/commandes/commande-workflow-actions';

type WorkflowSnapshot = {
  currentJalon: { id: string; label: string; avancement: number };
  nextJalon: { id: string; label: string; avancement: number } | null;
  blockers: string[];
  progressPercent: number;
};

type Props = {
  commandeId: string;
  avancement: number;
  workflow: { snapshot: WorkflowSnapshot } | null;
  hasDossier: boolean;
  onUpdated: () => void;
};

function ProgressRing({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  return (
    <svg className="ops-prog-ring" viewBox="0 0 44 44" aria-hidden>
      <circle className="ops-prog-ring__track" cx="22" cy="22" r={r} />
      <circle
        className="ops-prog-ring__fill"
        cx="22"
        cy="22"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function OrderProductionStepper({
  commandeId, avancement, workflow, hasDossier, onUpdated,
}: Props) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const mayForce = role === 'admin' || role === 'manager';
  const [loading, setLoading] = useState(false);
  const snapshot = workflow?.snapshot;
  const progress = Math.max(0, Math.min(100, snapshot?.progressPercent ?? avancement ?? 0));
  const hasBlockers = (snapshot?.blockers.length ?? 0) > 0;
  const currentIdx = resolveWorkflowJalonIndex({
    currentJalonId: snapshot?.currentJalon.id,
    progressPercent: progress,
  });
  const currentLabel =
    snapshot?.currentJalon.label
    ?? COMMANDE_WORKFLOW_JALONS[currentIdx]?.label
    ?? 'En cours';

  const postWorkflow = async (body: Record<string, unknown>) => {
    const r = await fetch(`/api/commandes/${commandeId}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      uxToast.error(getApiErrorMessage(d, 'Workflow impossible'));
      return false;
    }
    return d;
  };

  const advance = async (force = false) => {
    if (!snapshot?.nextJalon) return;
    setLoading(true);
    try {
      const d = await postWorkflow({
        type: 'jalon',
        jalonId: snapshot.nextJalon.id,
        ...(force ? { force: true } : {}),
      });
      if (d) {
        uxToast.success(`Jalon « ${snapshot.nextJalon.label} »`);
        onUpdated();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ops-prog">
      <header className="ops-prog__head">
        <div className="ops-prog__head-main">
          <div className="ops-prog__ring-wrap">
            <ProgressRing value={progress} />
            <span className="ops-prog__ring-val">{Math.round(progress)}%</span>
          </div>
          <div className="min-w-0">
            <p className="ops-prog__eyebrow">
              <Factory size={12} aria-hidden /> Progression production
            </p>
            <p className="ops-prog__current">{currentLabel}</p>
            {snapshot?.nextJalon && (
              <p className="ops-prog__next">Suivant · {snapshot.nextJalon.label}</p>
            )}
          </div>
        </div>
        <div
          className="ops-prog__bar"
          role="progressbar"
          aria-label="Progression production"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="ops-prog__bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Rail jalons retiré : le Parcours de la commande (LifeRail) fait déjà ce rôle.
          Blocages déjà affichés dans cmd-guided__status au-dessus. */}

      <div className="ops-prog__actions">
        {!hasDossier && (
          <Link
            href={`/production/dossiers?commande=${commandeId}`}
            className="ops-prog__btn ops-prog__btn--primary"
          >
            Créer dossier GPAO
          </Link>
        )}
        {hasDossier && (
          <Link href={`/production/dossiers?commande=${commandeId}`} className="ops-prog__btn">
            Ouvrir production
          </Link>
        )}
        <Link href={`/production/qualite?commande=${commandeId}`} className="ops-prog__btn">
          Contrôle qualité
        </Link>
        {snapshot && (
          <CommandeWorkflowActions
            commandeId={commandeId}
            blockers={snapshot.blockers}
            nextJalonLabel={snapshot.nextJalon?.label}
          />
        )}
        {snapshot?.nextJalon && (
          <button
            type="button"
            disabled={loading || (hasBlockers && !mayForce)}
            onClick={() => void advance(false)}
            className="ops-prog__btn ops-prog__btn--accent"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
            {snapshot.nextJalon.label}
          </button>
        )}
        {snapshot?.nextJalon && hasBlockers && mayForce && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void advance(true)}
            className="ops-prog__btn ops-prog__btn--warn"
          >
            <Shield size={12} /> Override
          </button>
        )}
      </div>
    </div>
  );
}
