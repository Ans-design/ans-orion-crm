'use client';

import { Clock, User } from 'lucide-react';

type OrionEmployeeDelayCardProps = {
  employeeName: string;
  matricule: string;
  poste?: string | null;
  departement?: string | null;
  scheduledTime: string;
  currentTime?: string | null;
  retardMin: number;
};

/** Carte employé — contexte RH pour déclaration de retard. */
export function OrionEmployeeDelayCard({
  employeeName,
  matricule,
  poste,
  departement,
  scheduledTime,
  currentTime,
  retardMin,
}: OrionEmployeeDelayCardProps) {
  const serviceLine = [poste, departement].filter(Boolean).join(' · ');

  return (
    <div className="rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-context-soft)] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-chip)] text-[var(--text-muted)]"
            aria-hidden
          >
            <User size={18} />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-[var(--text-main)] truncate">{employeeName}</p>
            {serviceLine ? (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{serviceLine}</p>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-chip)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--text-muted)]">
          {matricule}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--danger)_22%,transparent)] bg-[color-mix(in_srgb,var(--danger)_6%,var(--bg-card))] px-3 py-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]"
          aria-hidden
        >
          <Clock size={16} />
        </span>
        <div className="flex-1 min-w-0 text-sm text-[var(--text-main)]">
          <span className="text-[var(--text-muted)]">Prévu </span>
          <strong>{scheduledTime}</strong>
          {currentTime ? (
            <>
              <span className="text-[var(--text-muted)]"> · Actuel </span>
              <strong>{currentTime}</strong>
            </>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-2.5 py-1 text-xs font-bold text-[var(--danger)]">
          +{retardMin} min
        </span>
      </div>
    </div>
  );
}
