'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, CircleDot, ClipboardList, ListTodo } from 'lucide-react';
import { unwrapApiData, unwrapListItems } from '@/lib/api-client';
import { useCommercialJourney } from '@/lib/commercial/use-commercial-journey';
import { useCommandeOpsJourney } from '@/lib/commande/use-commande-ops-journey';
import { toCommandeStatutLabel } from '@/lib/data/commande-statut-display';

type TaskRow = {
  id: string;
  title: string;
  status: string;
  type?: string | null;
};

type PreviewState = {
  loading: boolean;
  numero: string | null;
  statut: string | null;
  tasks: TaskRow[];
};

const empty: PreviewState = { loading: false, numero: null, statut: null, tasks: [] };

function countByStatus(tasks: TaskRow[]) {
  let aFaire = 0;
  let enCours = 0;
  let terminees = 0;
  for (const t of tasks) {
    if (t.status === 'Terminée') terminees += 1;
    else if (t.status === 'En cours' || t.status === 'En pause') enCours += 1;
    else if (t.status !== 'Annulée') aFaire += 1;
  }
  return { aFaire, enCours, terminees };
}

/**
 * Sous l’étape Commercial « Commandes » : commande active + tâches
 * (à faire / en cours / terminées) + raccourcis Planning Gantt & Équipe.
 */
export function CommandeFlowPreview({
  onNavigate,
}: {
  onNavigate: (href: string, label?: string) => void;
}) {
  const { snapshot: commercial, isCurrent } = useCommercialJourney();
  const { snapshot: ops } = useCommandeOpsJourney();

  const commandeId = ops.commandeId || commercial.lastCommandeId || null;
  const show = Boolean(commandeId) && (isCurrent('commandes') || Boolean(ops.commandeId));

  const [state, setState] = useState<PreviewState>(empty);

  useEffect(() => {
    if (!show || !commandeId) {
      setState(empty);
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    const numeroHint = ops.numero;
    const statutHint = ops.statut;

    Promise.all([
      fetch(`/api/commandes/${encodeURIComponent(commandeId)}/overview`, {
        credentials: 'include',
        cache: 'no-store',
      })
        .then(async (r) => {
          if (!r.ok) return null;
          const data = unwrapApiData<{ commande?: { numero?: string; statut?: string } }>(await r.json());
          return data?.commande ?? null;
        })
        .catch(() => null),
      fetch(`/api/equipe/taches?commandeId=${encodeURIComponent(commandeId)}`, {
        credentials: 'include',
        cache: 'no-store',
      })
        .then(async (r) => (r.ok ? unwrapListItems<TaskRow>(await r.json()) : []))
        .catch(() => [] as TaskRow[]),
    ]).then(([cmd, tasks]) => {
      if (cancelled) return;
      setState({
        loading: false,
        numero: cmd?.numero ?? numeroHint ?? null,
        statut: cmd?.statut ? toCommandeStatutLabel(String(cmd.statut)) : statutHint,
        tasks: Array.isArray(tasks) ? tasks : [],
      });
    });

    return () => {
      cancelled = true;
    };
  }, [show, commandeId, ops.numero, ops.statut]);

  const counts = useMemo(() => countByStatus(state.tasks), [state.tasks]);
  const openTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => t.status !== 'Terminée' && t.status !== 'Annulée')
        .slice(0, 4),
    [state.tasks],
  );

  if (!show || !commandeId) return null;

  const label = state.numero ?? 'Commande';
  const hrefCmd = `/commandes/${commandeId}`;
  const hrefPlan = `/planning?commande=${encodeURIComponent(commandeId)}`;
  const hrefTasks = `/equipe/taches?commande=${encodeURIComponent(commandeId)}`;

  return (
    <div className="orion-sb-cmd-preview" aria-label={`Suivi ${label}`}>
      <button
        type="button"
        className="orion-sb-cmd-preview__head"
        onClick={() => onNavigate(hrefCmd, label)}
      >
        <ClipboardList size={12} strokeWidth={2} aria-hidden />
        <span className="orion-sb-cmd-preview__numero truncate">{label}</span>
        {state.statut ? (
          <span className="orion-sb-cmd-preview__statut truncate">{state.statut}</span>
        ) : null}
      </button>

      <div className="orion-sb-cmd-preview__counts" aria-label="Tâches commande">
        <span title="À faire">
          <CircleDot size={10} aria-hidden /> {counts.aFaire} à faire
        </span>
        <span title="En cours">
          <ListTodo size={10} aria-hidden /> {counts.enCours} en cours
        </span>
        <span title="Terminées">
          <CheckCircle2 size={10} aria-hidden /> {counts.terminees} finies
        </span>
      </div>

      {openTasks.length > 0 && (
        <ul className="orion-sb-cmd-preview__tasks">
          {openTasks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="orion-sb-cmd-preview__task"
                onClick={() =>
                  onNavigate(
                    `/equipe/taches?commande=${encodeURIComponent(commandeId)}&tache=${encodeURIComponent(t.id)}`,
                    t.title,
                  )
                }
              >
                <span className={`orion-sb-cmd-preview__dot is-${t.status === 'En cours' ? 'run' : 'todo'}`} />
                <span className="truncate">{t.title}</span>
                <span className="orion-sb-cmd-preview__task-st">{t.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!state.loading && state.tasks.length === 0 && (
        <p className="orion-sb-cmd-preview__empty">Aucune tâche liée — ouvrir Planning pour planifier</p>
      )}

      <div className="orion-sb-cmd-preview__links">
        <button
          type="button"
          className="orion-sb-cmd-preview__link"
          onClick={() => onNavigate(hrefPlan, 'Planning Gantt')}
        >
          <CalendarRange size={11} aria-hidden />
          Planning Gantt
        </button>
        <button
          type="button"
          className="orion-sb-cmd-preview__link"
          onClick={() => onNavigate(hrefTasks, 'Tâches')}
        >
          <ListTodo size={11} aria-hidden />
          Tâches
        </button>
      </div>
    </div>
  );
}
