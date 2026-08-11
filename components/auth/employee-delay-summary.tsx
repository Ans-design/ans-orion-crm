'use client';

import { Clock, User } from 'lucide-react';

export type EmployeeDelaySummaryProps = {
  employeeName: string;
  matricule: string;
  poste?: string | null;
  departement?: string | null;
  scheduledTime: string;
  currentTime?: string | null;
  retardMin: number;
};

/** Carte employé claire — contexte RH déclaration de retard. */
export function EmployeeDelaySummary({
  employeeName,
  matricule,
  poste,
  departement,
  scheduledTime,
  currentTime,
  retardMin,
}: EmployeeDelaySummaryProps) {
  const serviceLine = [poste, departement].filter(Boolean).join(' · ');

  return (
    <div className="late-arrival-employee-card">
      <div className="late-arrival-employee-card__identity">
        <span className="late-arrival-employee-card__avatar" aria-hidden>
          <User size={18} strokeWidth={2} />
        </span>
        <div className="late-arrival-employee-card__meta min-w-0">
          <div className="late-arrival-employee-card__name-row">
            <p className="late-arrival-employee-card__name">{employeeName}</p>
            <span className="late-arrival-employee-card__badge">{matricule}</span>
          </div>
          {serviceLine ? (
            <p className="late-arrival-employee-card__role">{serviceLine}</p>
          ) : null}
        </div>
      </div>

      <div className="late-arrival-employee-card__timing">
        <Clock size={16} strokeWidth={2} className="late-arrival-employee-card__clock" aria-hidden />
        <p className="late-arrival-employee-card__times">
          <span className="late-arrival-employee-card__time-label">Prévu </span>
          <strong>{scheduledTime}</strong>
          {currentTime ? (
            <>
              <span className="late-arrival-employee-card__time-sep" aria-hidden>·</span>
              <span className="late-arrival-employee-card__time-label">Actuel </span>
              <strong>{currentTime}</strong>
            </>
          ) : null}
        </p>
        <span className="late-arrival-employee-card__delay">+{retardMin} min</span>
      </div>
    </div>
  );
}
