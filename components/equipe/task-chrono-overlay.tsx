'use client';

import { Pause, Play, CheckCircle2, Timer } from 'lucide-react';

type TaskChronoOverlayProps = {
  title: string;
  elapsedLabel: string;
  acting?: boolean;
  onPause: () => void;
  onFinish: () => void;
  onMinimize?: () => void;
};

/** Overlay plein écran chronomètre atelier (style HTML v29 dig-wrap). */
export function TaskChronoOverlay({
  title,
  elapsedLabel,
  acting,
  onPause,
  onFinish,
  onMinimize,
}: TaskChronoOverlayProps) {
  return (
    <div className="task-chrono-overlay" role="dialog" aria-modal="true" aria-label="Chronomètre tâche">
      <div className="task-chrono-card">
        <p className="task-chrono-eyebrow">
          <Timer size={14} aria-hidden />
          Tâche en cours
        </p>
        <h2 className="task-chrono-title">{title}</h2>
        <div className="task-chrono-dig-wrap">
          <span className="task-chrono-dig" aria-live="polite">
            {elapsedLabel}
          </span>
        </div>
        <div className="task-chrono-actions">
          <button
            type="button"
            className="task-chrono-btn task-chrono-btn--pause"
            disabled={acting}
            onClick={onPause}
          >
            <Pause size={16} aria-hidden />
            Pause
          </button>
          <button
            type="button"
            className="task-chrono-btn task-chrono-btn--done btn-task-done"
            disabled={acting}
            onClick={onFinish}
          >
            <CheckCircle2 size={16} aria-hidden />
            Terminé
          </button>
        </div>
        {onMinimize ? (
          <button type="button" className="task-chrono-minimize" onClick={onMinimize}>
            Réduire
          </button>
        ) : null}
        <p className="task-chrono-hint">Reprendre depuis la liste après une pause.</p>
      </div>
    </div>
  );
}

type PausedBannerProps = {
  title: string;
  elapsedLabel: string;
  acting?: boolean;
  onResume: () => void;
  onFinish: () => void;
};

export function TaskPausedBanner({
  title,
  elapsedLabel,
  acting,
  onResume,
  onFinish,
}: PausedBannerProps) {
  return (
    <div className="task-paused-banner" role="status">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80">En pause</p>
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-xs font-mono tabular-nums text-muted-foreground">{elapsedLabel}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          className="task-chrono-btn task-chrono-btn--resume"
          disabled={acting}
          onClick={onResume}
        >
          <Play size={14} aria-hidden />
          Reprendre
        </button>
        <button
          type="button"
          className="task-chrono-btn task-chrono-btn--done btn-task-done"
          disabled={acting}
          onClick={onFinish}
        >
          <CheckCircle2 size={14} aria-hidden />
          Terminé
        </button>
      </div>
    </div>
  );
}
