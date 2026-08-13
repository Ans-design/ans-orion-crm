'use client';

/**
 * Tâches du poste (Mon studio / atelier) — play / pause / terminé + résumé journalier.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Pause, CheckCircle2, Timer } from 'lucide-react';
import { TaskChronoOverlay, TaskPausedBanner } from '@/components/equipe/task-chrono-overlay';
import { DelayDeclarationModal } from '@/components/workspace/delay-declaration-modal';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import { liveFetch } from '@/lib/live/orion-live';
import { unwrapApiData, unwrapListItems } from '@/lib/api-client';
import { uxToast } from '@/lib/ux/feedback';
import { cn } from '@/lib/utils';
import { derivePosteLabels } from '@/lib/metier/poste-labels';
import { formatExtraHours, needsDelayDeclaration } from '@/lib/metier/task-delay';

type TaskRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  elapsedSec: number;
  pauseSec?: number;
  pauseCount?: number;
  timerStatus: string;
  timerStartedAt: string | null;
  estimatedMin: number | null;
  dueDate?: string | null;
  delayMotif?: string | null;
  extraMin?: number | null;
  delayDeclaredAt?: string | null;
  commande: { id: string; numero: string; article: string } | null;
};

type ResumeRow = {
  assigneeName: string;
  workSec: number;
  pauseSec: number;
  pauseCount: number;
  openCount: number;
  finishedToday: number;
  labels: string[];
};

function liveElapsed(task: TaskRow, tick: number): number {
  void tick;
  if (task.timerStatus !== 'running' || !task.timerStartedAt) return task.elapsedSec;
  const delta = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
  return task.elapsedSec + Math.max(0, delta);
}

function formatClock(sec: number): string {
  const h = Math.floor(Math.max(0, sec) / 3600);
  const m = Math.floor((Math.max(0, sec) % 3600) / 60);
  const s = Math.max(0, sec) % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function remainingSec(task: TaskRow, tick: number): number | null {
  if (!task.estimatedMin) return null;
  return Math.max(0, task.estimatedMin * 60 - liveElapsed(task, tick));
}

function isToday(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

type Props = {
  type?: string;
  title?: string;
};

export function PosteTachesBoard({ type, title = 'Tâches du jour' }: Props) {
  const liveTick = useOrionLiveRevision(['commandes', 'production', 'nav', 'rh'], { debounceMs: 400 });
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [resume, setResume] = useState<ResumeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [chronoMinimized, setChronoMinimized] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams({ mine: '1' });
    if (type) q.set('type', type);
    fetch(`/api/equipe/taches?${q}`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('load');
        return unwrapListItems<TaskRow>(await r.json());
      })
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
    fetch('/api/equipe/taches?mine=1&resume=today', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { resume: [] }))
      .then((body) => {
        const d = unwrapApiData<{ resume?: ResumeRow[] }>(body);
        setResume(d?.resume?.[0] ?? null);
      })
      .catch(() => setResume(null));
  }, [type]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (liveTick === 0) return;
    load();
  }, [liveTick, load]);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'Annulée');
    const today = open.filter((t) => {
      if (t.timerStatus === 'running' || t.timerStatus === 'paused' || t.status === 'En pause' || t.status === 'En cours') {
        return true;
      }
      if (t.status === 'Terminée') return isToday(t.dueDate);
      if (!t.dueDate) return true;
      const due = new Date(t.dueDate);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return due.getTime() <= start.getTime() + 86_400_000;
    });
    const openFirst = [...today].sort((a, b) => {
      const rank = (t: TaskRow) =>
        t.timerStatus === 'running' ? 0
          : t.timerStatus === 'paused' || t.status === 'En pause' ? 1
            : t.status === 'Terminée' ? 3
              : 2;
      return rank(a) - rank(b);
    });
    return openFirst;
  }, [tasks]);

  const activeRunning = visible.find((t) => t.timerStatus === 'running') ?? null;
  const activePaused = !activeRunning
    ? visible.find((t) => t.timerStatus === 'paused' || t.status === 'En pause') ?? null
    : null;
  const overdueTask = visible.find((t) => needsDelayDeclaration(t)) ?? null;

  const timerAction = async (taskId: string, action: string) => {
    const target = visible.find((t) => t.id === taskId);
    if (target && needsDelayDeclaration(target) && action !== 'finish' && action !== 'pause') {
      return;
    }
    setActing(taskId);
    try {
      const res = await liveFetch(`/api/equipe/taches/${taskId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        load();
        if (action === 'finish') uxToast.success('Tâche terminée — vous pouvez enchaîner');
      } else {
        uxToast.error('Action chronomètre impossible');
      }
    } finally {
      setActing(null);
    }
  };

  const declareDelay = async (taskId: string, motif: string, extraMin: number) => {
    setActing(taskId);
    try {
      const res = await liveFetch(`/api/equipe/taches/${taskId}/delay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif, extraMin }),
      });
      if (res.ok) {
        uxToast.success(`+${formatExtraHours(extraMin)} replanifié sur le Gantt`);
        load();
      } else {
        uxToast.error('Déclaration de retard impossible');
      }
    } finally {
      setActing(null);
    }
  };

  const localLabels = useMemo(() => {
    if (resume?.labels?.length) return resume.labels;
    const workSec = visible.reduce((s, t) => s + liveElapsed(t, tick), 0);
    const pauseSec = visible.reduce((s, t) => s + (t.pauseSec || 0), 0);
    return derivePosteLabels({
      workSec,
      pauseSec,
      pauseCount: visible.reduce((s, t) => s + (t.pauseCount || 0), 0),
      estimatedSec: visible.reduce((s, t) => s + (t.estimatedMin || 0) * 60, 0) || null,
      openCount: visible.filter((t) => !['Terminée', 'Annulée'].includes(t.status)).length,
      finishedToday: visible.filter((t) => t.status === 'Terminée').length,
      running: Boolean(activeRunning),
    });
  }, [resume, visible, tick, activeRunning]);

  return (
    <section className="rounded-[7px] border border-[#e8edf5] bg-white/95 dark:bg-card dark:border-border p-4 space-y-3">
      {overdueTask ? (
        <DelayDeclarationModal
          title={overdueTask.title}
          commandeLabel={
            overdueTask.commande
              ? `${overdueTask.commande.numero} · ${overdueTask.commande.article}`
              : null
          }
          acting={acting === overdueTask.id}
          onSubmit={({ motif, extraMin }) => void declareDelay(overdueTask.id, motif, extraMin)}
          onFinish={() => void timerAction(overdueTask.id, 'finish')}
        />
      ) : null}
      {activeRunning && !chronoMinimized && !overdueTask && (
        <TaskChronoOverlay
          title={activeRunning.title}
          elapsedLabel={
            remainingSec(activeRunning, tick) != null
              ? `Reste ${formatClock(remainingSec(activeRunning, tick)!)}`
              : formatClock(liveElapsed(activeRunning, tick))
          }
          acting={acting === activeRunning.id}
          onPause={() => void timerAction(activeRunning.id, 'pause')}
          onFinish={() => void timerAction(activeRunning.id, 'finish')}
          onMinimize={() => setChronoMinimized(true)}
        />
      )}
      {activePaused && (
        <TaskPausedBanner
          title={activePaused.title}
          elapsedLabel={formatClock(liveElapsed(activePaused, tick))}
          acting={acting === activePaused.id}
          onResume={() => void timerAction(activePaused.id, 'resume')}
          onFinish={() => void timerAction(activePaused.id, 'finish')}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-extrabold text-[#172033] dark:text-foreground flex items-center gap-2">
          <Timer size={15} className="text-[#3b72f2]" />
          {title}
        </h2>
        {localLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1 justify-end">
            {localLabels.map((l) => (
              <span
                key={l}
                className="rounded-[7px] px-2 py-0.5 text-[9px] font-extrabold bg-[#eef3ff] text-[#3769db]"
              >
                {l}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {resume ? (
        <p className="m-0 text-[11px] text-[#71809a]">
          Travail {formatClock(resume.workSec)} · Pauses {formatClock(resume.pauseSec)} ({resume.pauseCount}) ·
          Terminées {resume.finishedToday}
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-[#71809a] m-0">Chargement des tâches planifiées…</p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-[#71809a] m-0">
          Aucune tâche planifiée pour vous aujourd’hui. Dès que l’admin pose un créneau Gantt à votre nom, elle apparaît ici.
        </p>
      ) : (
        <ul className="m-0 p-0 list-none grid gap-2">
          {visible.map((task) => {
            const remain = remainingSec(task, tick);
            const running = task.timerStatus === 'running';
            const paused = task.timerStatus === 'paused' || task.status === 'En pause';
            const done = task.status === 'Terminée';
            const overdue = needsDelayDeclaration(task);
            return (
              <li
                key={task.id}
                className={cn(
                  'rounded-[7px] border px-3 py-2.5 flex flex-wrap items-center gap-2',
                  running && 'border-[#3b72f2] bg-[#f4f7ff]',
                  paused && 'border-amber-300 bg-amber-50',
                  overdue && 'border-red-400 bg-red-50',
                  done && 'opacity-60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[12px] font-bold truncate">{task.title}</p>
                  <p className="m-0 text-[10px] text-[#71809a] truncate">
                    {task.commande ? `${task.commande.numero} · ${task.commande.article}` : task.type}
                    {' · '}
                    {overdue
                      ? 'Créneau dépassé — motif + temps supplémentaire obligatoires'
                      : remain != null ? `Reste ${formatClock(remain)}` : formatClock(liveElapsed(task, tick))}
                    {task.extraMin && task.delayDeclaredAt
                      ? ` · Suite +${formatExtraHours(task.extraMin)} demain`
                      : ''}
                  </p>
                </div>
                {!done ? (
                  <div className="flex gap-1.5">
                    {running ? (
                      <button
                        type="button"
                        className="rounded-[7px] h-8 px-2.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 inline-flex items-center gap-1"
                        disabled={acting === task.id}
                        onClick={() => void timerAction(task.id, 'pause')}
                      >
                        <Pause size={12} /> Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-[7px] h-8 px-2.5 text-[10px] font-extrabold bg-[#3b72f2] text-white inline-flex items-center gap-1"
                        disabled={acting === task.id}
                        onClick={() => void timerAction(task.id, paused ? 'resume' : 'start')}
                      >
                        <Play size={12} /> {paused ? 'Reprendre' : 'Play'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-[7px] h-8 px-2.5 text-[10px] font-extrabold bg-emerald-600 text-white inline-flex items-center gap-1"
                      disabled={acting === task.id}
                      onClick={() => void timerAction(task.id, 'finish')}
                    >
                      <CheckCircle2 size={12} /> Terminé
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700">Terminée</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
