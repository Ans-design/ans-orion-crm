'use client';

import { useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import {
  DELAY_EXTRA_PRESETS_MIN,
  DELAY_MOTIF_MIN,
  formatExtraHours,
} from '@/lib/metier/task-delay';

type Props = {
  title: string;
  commandeLabel?: string | null;
  acting?: boolean;
  onSubmit: (input: { motif: string; extraMin: number }) => void;
  onFinish?: () => void;
};

export function DelayDeclarationModal({ title, commandeLabel, acting, onSubmit, onFinish }: Props) {
  const [motif, setMotif] = useState('');
  const [extraMin, setExtraMin] = useState(120);
  const [error, setError] = useState('');

  const submit = () => {
    if (motif.trim().length < DELAY_MOTIF_MIN) {
      setError(`Motif obligatoire (${DELAY_MOTIF_MIN} caractères min.)`);
      return;
    }
    setError('');
    onSubmit({ motif: motif.trim(), extraMin });
  };

  return (
    <div className="task-chrono-overlay" role="dialog" aria-modal="true" aria-label="Déclaration de retard de production">
      <div className="task-chrono-card" style={{ maxWidth: 440 }}>
        <p className="task-chrono-eyebrow">
          <AlertTriangle size={14} aria-hidden />
          Créneau Gantt dépassé
        </p>
        <h2 className="task-chrono-title">{title}</h2>
        {commandeLabel ? (
          <p className="m-0 text-[11px] text-[#71809a]">{commandeLabel}</p>
        ) : null}
        <p className="m-0 text-[12px] text-[#445066]">
          La tâche n’est pas finie comme prévu. Indiquez le motif du retard et le temps à rajouter — il sera
          replanifié demain sur le Planning Gantt.
        </p>

        <label className="grid gap-1 text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#71809a]">Motif du retard</span>
          <textarea
            className="rounded-[7px] border border-[#d8e0ee] px-3 py-2 text-[12px] min-h-[72px]"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. fichiers client incomplets, correction BAT, machine occupée…"
            maxLength={500}
          />
        </label>

        <div className="grid gap-1.5 text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#71809a] inline-flex items-center gap-1">
            <Clock size={11} /> Temps supplémentaire (demain)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DELAY_EXTRA_PRESETS_MIN.map((m) => (
              <button
                key={m}
                type="button"
                className={`rounded-[7px] h-8 px-2.5 text-[10px] font-extrabold border ${
                  extraMin === m
                    ? 'bg-[#3b72f2] text-white border-[#3b72f2]'
                    : 'bg-white text-[#172033] border-[#d8e0ee]'
                }`}
                onClick={() => setExtraMin(m)}
              >
                +{formatExtraHours(m)}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="m-0 text-[11px] font-bold text-red-600">{error}</p> : null}

        <div className="task-chrono-actions">
          <button
            type="button"
            className="task-chrono-btn task-chrono-btn--done btn-task-done"
            disabled={acting}
            onClick={submit}
          >
            Replanifier +{formatExtraHours(extraMin)}
          </button>
          {onFinish ? (
            <button
              type="button"
              className="task-chrono-btn task-chrono-btn--pause"
              disabled={acting}
              onClick={onFinish}
            >
              Terminé sans rajout
            </button>
          ) : null}
        </div>
        <p className="task-chrono-hint">Obligatoire pour continuer : motif + estimation, ou clôturer si c’est fini.</p>
      </div>
    </div>
  );
}
