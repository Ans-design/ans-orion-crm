'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ListTodo, Play, Pause, AlertTriangle, Loader2, Timer, CheckCircle2, Ban,
} from 'lucide-react';
import { TaskDetailModal } from '@/components/equipe/task-detail-modal';
import { TaskChronoOverlay, TaskPausedBanner } from '@/components/equipe/task-chrono-overlay';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import {
  TASK_STATUSES,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  type TaskType,
} from '@/lib/constants/metier-task';
import {
  AppPageHeader, AppKpiCard, AppButton, AppEmptyState, AppListSkeleton,
} from '@/components/ui/app-ui';
import { unwrapListItems } from '@/lib/api-client';
import { uxToast } from '@/lib/ux/feedback';

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priorite: string;
  elapsedSec: number;
  timerStatus: string;
  timerStartedAt: string | null;
  estimatedMin: number | null;
  problemNote: string | null;
  commande: { id: string; numero: string; article: string } | null;
};

function liveElapsed(task: TaskRow, tick: number): number {
  void tick;
  if (task.timerStatus !== 'running' || !task.timerStartedAt) return task.elapsedSec;
  const delta = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
  return task.elapsedSec + Math.max(0, delta);
}

function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function statusTone(status: string): string {
  if (status === 'Bloquée' || status === 'Annulée') return 'danger';
  if (status === 'En cours') return 'run';
  if (status === 'En pause') return 'gold';
  if (status === 'Terminée') return 'ok';
  return 'neutral';
}

/** Titre court sans répéter le n° commande déjà dans l’en-tête de groupe. */
function shortTaskTitle(title: string, numero?: string | null): string {
  let t = title.trim();
  if (numero) {
    t = t.replace(new RegExp(`\\s*[—–-]\\s*${numero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '');
    t = t.replace(new RegExp(`${numero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[—–-]\\s*`, 'i'), '');
  }
  return t.trim() || title;
}

function cleanDesc(desc: string, numero?: string | null): string {
  let d = desc.trim();
  if (numero) {
    d = d.replace(new RegExp(numero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').replace(/\s{2,}/g, ' ').trim();
  }
  return d;
}

type TaskGroup = {
  key: string;
  commande: TaskRow['commande'];
  tasks: TaskRow[];
};

function groupTasksByCommande(tasks: TaskRow[]): TaskGroup[] {
  const map = new Map<string, TaskGroup>();
  for (const task of tasks) {
    const key = task.commande?.id ?? 'none';
    const existing = map.get(key);
    if (existing) existing.tasks.push(task);
    else map.set(key, { key, commande: task.commande, tasks: [task] });
  }
  return Array.from(map.values());
}

function EquipeTachesContent() {
  const searchParams = useSearchParams();
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'tous');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'tous');
  const [tick, setTick] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [chronoMinimized, setChronoMinimized] = useState(false);
  const [assigneeKpis, setAssigneeKpis] = useState<{
    assigneeName: string; completed: number; avgQuality: number; avgDelay: number; avgElapsedMin: number; onTimePct: number;
  }[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (typeFilter !== 'tous') q.set('type', typeFilter);
    if (statusFilter !== 'tous') q.set('status', statusFilter);
    if (commandeId) q.set('commandeId', commandeId);
    fetch(`/api/equipe/taches?${q}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('load');
        return unwrapListItems<TaskRow>(await r.json());
      })
      .then(setTasks)
      .catch(() => {
        setTasks([]);
        uxToast.error('Impossible de charger les tâches');
      })
      .finally(() => setLoading(false));
    fetch('/api/equipe/taches?stats=1&kpi=1')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { assigneeKpis?: typeof assigneeKpis }) => setAssigneeKpis(d.assigneeKpis ?? []))
      .catch(() => setAssigneeKpis([]));
  }, [typeFilter, statusFilter, commandeId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const tacheId = searchParams.get('tache');
    if (tacheId) setDetailId(tacheId);
  }, [searchParams]);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => ({
    open: tasks.filter((t) => !['Terminée', 'Annulée'].includes(t.status)).length,
    running: tasks.filter((t) => t.timerStatus === 'running').length,
    blocked: tasks.filter((t) => t.status === 'Bloquée').length,
  }), [tasks]);

  const activeRunning = useMemo(
    () => tasks.find((t) => t.timerStatus === 'running') ?? null,
    [tasks],
  );
  const activePaused = useMemo(
    () => (!activeRunning
      ? tasks.find((t) => t.timerStatus === 'paused' || t.status === 'En pause') ?? null
      : null),
    [tasks, activeRunning],
  );

  useEffect(() => {
    if (activeRunning) setChronoMinimized(false);
  }, [activeRunning]);

  const timerAction = async (
    taskId: string,
    action: string,
    problemNote?: string,
    evaluation?: { quality: number; delay: number; comment?: string; problemEncountered?: string },
  ) => {
    setActing(taskId);
    try {
      const res = await fetch(`/api/equipe/taches/${taskId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, problemNote, evaluation }),
      });
      if (res.ok) load();
      else uxToast.error('Action chronomètre impossible');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="metier-taches-page">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}

      {activeRunning && !chronoMinimized && (
        <TaskChronoOverlay
          title={activeRunning.title}
          elapsedLabel={formatElapsed(liveElapsed(activeRunning, tick))}
          acting={acting === activeRunning.id}
          onPause={() => void timerAction(activeRunning.id, 'pause')}
          onFinish={() => void timerAction(activeRunning.id, 'finish')}
          onMinimize={() => setChronoMinimized(true)}
        />
      )}

      {activePaused && (
        <TaskPausedBanner
          title={activePaused.title}
          elapsedLabel={formatElapsed(liveElapsed(activePaused, tick))}
          acting={acting === activePaused.id}
          onResume={() => void timerAction(activePaused.id, 'resume')}
          onFinish={() => void timerAction(activePaused.id, 'finish')}
        />
      )}

      {activeRunning && chronoMinimized && (
        <button
          type="button"
          className="task-paused-banner w-full text-left"
          onClick={() => setChronoMinimized(false)}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Chrono réduit</p>
            <p className="text-sm font-semibold truncate">{activeRunning.title}</p>
            <p className="text-xs font-mono tabular-nums">{formatElapsed(liveElapsed(activeRunning, tick))}</p>
          </div>
          <span className="text-xs font-bold text-[var(--orion-red)] shrink-0">Agrandir</span>
        </button>
      )}

      <AppPageHeader
        title="Tâches métier"
        description="GPAO synchronisée — commandes, chronomètre, assignation"
        icon={ListTodo}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <AppKpiCard label="Ouvertes" value={stats.open} icon={ListTodo} tone="info" onClick={() => setStatusFilter('tous')} />
        <AppKpiCard label="En cours" value={stats.running} icon={Play} tone="gold" onClick={() => setStatusFilter('En cours')} />
        <AppKpiCard label="Bloquées" value={stats.blocked} icon={Ban} tone="danger" onClick={() => setStatusFilter('Bloquée')} />
      </div>

      {assigneeKpis.length > 0 && (
        <div className="metier-assignee-grid">
          {assigneeKpis.slice(0, 4).map((k) => (
            <div key={k.assigneeName} className="metier-assignee-card">
              <p className="metier-assignee-card__name">{k.assigneeName}</p>
              <p className="metier-assignee-card__sub">
                {k.completed} terminée{k.completed > 1 ? 's' : ''}
              </p>
              <div className="metier-assignee-card__tags">
                <span>Qualité {k.avgQuality || '—'}/5</span>
                <span>Délai {k.avgDelay || '—'}/5</span>
                <span>~{k.avgElapsedMin} min</span>
                {k.onTimePct > 0 && <span>{k.onTimePct}% à l&apos;heure</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="metier-filters">
        <div className="metier-filters__group">
          <span className="metier-filters__lab">Type</span>
          <div className="metier-filters__chips">
            {['tous', ...TASK_TYPES].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`metier-chip${typeFilter === t ? ' is-active is-type' : ''}`}
              >
                {t === 'tous' ? 'Tous' : TASK_TYPE_LABELS[t as TaskType]}
              </button>
            ))}
          </div>
        </div>
        <div className="metier-filters__group">
          <span className="metier-filters__lab">Statut</span>
          <div className="metier-filters__chips">
            {['tous', ...TASK_STATUSES].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`metier-chip${statusFilter === s ? ' is-active is-status' : ''}`}
              >
                {s === 'tous' ? 'Tous' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <AppListSkeleton rows={4} />
      ) : tasks.length === 0 ? (
        <AppEmptyState
          icon={ListTodo}
          title="Aucune tâche"
          description="Les nouvelles commandes génèrent automatiquement 4 tâches synchronisées."
        />
      ) : (
        <div className="metier-cmd-groups">
          {groupTasksByCommande(tasks).map((group) => (
            <section key={group.key} className="metier-cmd-group">
              <header className="metier-cmd-group__head">
                {group.commande ? (
                  <Link href={`/commandes/${group.commande.id}`} className="metier-cmd-group__link">
                    <span className="metier-cmd-group__num">{group.commande.numero}</span>
                    <span className="metier-cmd-group__art">{group.commande.article}</span>
                  </Link>
                ) : (
                  <span className="metier-cmd-group__art">Sans commande</span>
                )}
                <span className="metier-cmd-group__count">{group.tasks.length} tâche{group.tasks.length > 1 ? 's' : ''}</span>
              </header>

              <div className="metier-tasks-grid">
                {group.tasks.map((task) => {
                  const elapsed = liveElapsed(task, tick);
                  const estSec = (task.estimatedMin ?? 0) * 60;
                  const overBudget = estSec > 0 && elapsed > estSec;
                  const isClosed = ['Terminée', 'Annulée'].includes(task.status);
                  const tone = statusTone(task.status);
                  const shortTitle = shortTaskTitle(task.title, task.commande?.numero);
                  const canStart = !isClosed && task.timerStatus === 'idle' && task.status !== 'Bloquée';
                  const isRunning = task.timerStatus === 'running';
                  const isPaused = task.timerStatus === 'paused' || task.status === 'En pause';

                  return (
                    <article
                      key={task.id}
                      className={`metier-task-card metier-task-card--${tone}${canStart ? ' metier-task-card--startable' : ''}`}
                    >
                      <div className="metier-task-card__body">
                        <button
                          type="button"
                          className="metier-task-card__main"
                          onClick={() => setDetailId(task.id)}
                        >
                          <div className="metier-task-card__top">
                            <span className={`metier-task-status metier-task-status--${tone}`}>{task.status}</span>
                            <span className="metier-task-type">{TASK_TYPE_LABELS[task.type as TaskType] ?? task.type}</span>
                            {task.priorite === 'Urgent' && <span className="metier-task-urgent">Urgent</span>}
                          </div>
                          <h2 className="metier-task-card__title">{shortTitle}</h2>
                          {task.description ? (
                            <p className="metier-task-card__desc">{cleanDesc(task.description, task.commande?.numero)}</p>
                          ) : null}
                          {task.problemNote && (
                            <p className="metier-task-card__problem">
                              <AlertTriangle size={12} aria-hidden /> {task.problemNote}
                            </p>
                          )}
                          <div className={`metier-task-card__timer${overBudget ? ' is-over' : ''}`}>
                            <Timer size={14} aria-hidden />
                            <span className="tabular-nums">{formatElapsed(elapsed)}</span>
                            {task.estimatedMin ? (
                              <span className="metier-task-card__est">prévu {task.estimatedMin} min</span>
                            ) : null}
                          </div>
                        </button>

                        {!isClosed && (
                          <div className="metier-task-card__actions">
                            {canStart && (
                              <button
                                type="button"
                                className="metier-start-btn"
                                disabled={acting === task.id}
                                onClick={() => void timerAction(task.id, 'start')}
                              >
                                {acting === task.id ? (
                                  <Loader2 size={18} className="animate-spin" />
                                ) : (
                                  <Play size={18} fill="currentColor" />
                                )}
                                Démarrer
                              </button>
                            )}
                            {isRunning && (
                              <div className="metier-task-card__run-row">
                                <AppButton type="button" size="sm" variant="outline" disabled={acting === task.id} onClick={() => void timerAction(task.id, 'pause')}>
                                  <Pause size={13} /> Pause
                                </AppButton>
                                <AppButton type="button" size="sm" disabled={acting === task.id} onClick={() => void timerAction(task.id, 'finish')}>
                                  <CheckCircle2 size={13} /> Finie
                                </AppButton>
                              </div>
                            )}
                            {isPaused && !isRunning && (
                              <div className="metier-task-card__run-row">
                                <button
                                  type="button"
                                  className="metier-start-btn metier-start-btn--resume"
                                  disabled={acting === task.id}
                                  onClick={() => void timerAction(task.id, 'resume')}
                                >
                                  <Play size={18} fill="currentColor" />
                                  Reprendre
                                </button>
                                <AppButton type="button" size="sm" variant="outline" disabled={acting === task.id} onClick={() => void timerAction(task.id, 'finish')}>
                                  <CheckCircle2 size={13} /> Finie
                                </AppButton>
                              </div>
                            )}
                            {task.status !== 'Bloquée' && !canStart && (
                              <button
                                type="button"
                                className="metier-problem-btn"
                                disabled={acting === task.id}
                                onClick={() => setDetailId(task.id)}
                              >
                                <AlertTriangle size={13} /> Problème
                              </button>
                            )}
                            {canStart && (
                              <button
                                type="button"
                                className="metier-problem-btn"
                                disabled={acting === task.id}
                                onClick={() => setDetailId(task.id)}
                              >
                                <AlertTriangle size={13} /> Problème
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <TaskDetailModal
        taskId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onSaved={load}
        onTimerAction={timerAction}
        liveElapsed={detailId ? liveElapsed(tasks.find((t) => t.id === detailId) ?? { elapsedSec: 0, timerStatus: 'idle', timerStartedAt: null } as TaskRow, tick) : 0}
      />
    </div>
  );
}

export default function EquipeTachesPage() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <EquipeTachesContent />
    </Suspense>
  );
}
