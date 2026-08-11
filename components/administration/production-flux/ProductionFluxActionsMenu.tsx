'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Play,
  RefreshCw,
  RotateCcw,
  Calendar,
  ListTodo,
} from 'lucide-react';

type Props = {
  canEdit: boolean;
  busy: boolean;
  onSyncTasks: () => void;
  onSyncPlanning: () => void;
  onSimulate: () => void;
  onReset: () => void;
  onExport: () => void;
  onShowAnomalies: () => void;
};

export function ProductionFluxActionsMenu({
  canEdit,
  busy,
  onSyncTasks,
  onSyncPlanning,
  onSimulate,
  onReset,
  onExport,
  onShowAnomalies,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const panel = open ? (
    <div
      ref={panelRef}
      className="pf-actions-panel"
      style={{ top: pos.top, right: pos.right }}
    >
      <button type="button" disabled={busy} onClick={() => run(onSimulate)}>
        <Play className="h-3.5 w-3.5" /> Simuler workflow
      </button>
      {canEdit && (
        <>
          <button type="button" disabled={busy} onClick={() => run(onSyncTasks)}>
            <ListTodo className="h-3.5 w-3.5" /> Synchroniser tâches
          </button>
          <button type="button" disabled={busy} onClick={() => run(onSyncPlanning)}>
            <Calendar className="h-3.5 w-3.5" /> Synchroniser planning
          </button>
        </>
      )}
      <button type="button" disabled={busy} onClick={() => run(onExport)}>
        <Download className="h-3.5 w-3.5" /> Exporter configuration
      </button>
      {canEdit && (
        <button type="button" disabled={busy} onClick={() => run(onReset)}>
          <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser par défaut
        </button>
      )}
      <button type="button" onClick={() => run(onShowAnomalies)}>
        <AlertTriangle className="h-3.5 w-3.5" /> Voir anomalies workflow
      </button>
    </div>
  ) : null;

  return (
    <div ref={triggerRef} className="relative">
      <button
        type="button"
        className="pf-btn-ghost inline-flex items-center gap-1.5"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
      >
        Actions
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
