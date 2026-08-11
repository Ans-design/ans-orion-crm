'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { OrionRadioCardOption } from '@/components/orion/auth';
import { OrionRadioCardGroup } from '@/components/orion/auth';
import { EmployeeDelaySummary, type EmployeeDelaySummaryProps } from './employee-delay-summary';

export type DelayDeclarationCardProps = {
  phase: 'form' | 'success';
  employee: EmployeeDelaySummaryProps;
  cause: string;
  onCauseChange: (value: string) => void;
  causeOptions: OrionRadioCardOption[];
  remarque: string;
  onRemarqueChange: (value: string) => void;
  error?: string;
  saving: boolean;
  onSubmit: () => void;
  successMessage?: string;
  footerHelper?: string;
};

export function DelayDeclarationCard({
  phase,
  employee,
  cause,
  onCauseChange,
  causeOptions,
  remarque,
  onRemarqueChange,
  error,
  saving,
  onSubmit,
  successMessage = "Accès à l'application en cours…",
  footerHelper = 'Transmission automatique au service RH',
}: DelayDeclarationCardProps) {
  const isAutre = cause === 'Autre';
  const remarksErrorId = 'late-arrival-remarks-error';
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    const fit = () => {
      el.style.transform = '';
      el.style.marginBottom = '';
      const rect = el.getBoundingClientRect();
      const maxH = window.innerHeight - 24;
      if (rect.height > maxH) {
        const scale = Math.max(0.72, maxH / rect.height);
        el.style.transform = `scale(${scale})`;
        el.style.transformOrigin = 'center center';
        el.style.marginBottom = `${rect.height * (scale - 1)}px`;
      }
    };

    fit();
    window.addEventListener('resize', fit);
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => {
      window.removeEventListener('resize', fit);
      observer.disconnect();
    };
  }, [phase, isAutre, error, cause]);

  return (
    <motion.div
      ref={modalRef}
      className="late-arrival-modal"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="late-arrival-title"
      aria-describedby="late-arrival-subtitle"
    >
      {phase === 'success' ? (
        <motion.div
          className="late-arrival-success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          role="status"
        >
          <span className="late-arrival-success__icon" aria-hidden>
            <CheckCircle2 size={40} strokeWidth={2.25} />
          </span>
          <p className="late-arrival-success__title">Déclaration enregistrée</p>
          <p className="late-arrival-success__text">{successMessage}</p>
        </motion.div>
      ) : (
        <>
          <div className="late-arrival-body">
            <header className="late-arrival-header">
              <span className="late-arrival-header-icon" aria-hidden>
                <AlertTriangle size={20} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h2 id="late-arrival-title" className="late-arrival-title">
                  Déclaration de retard
                </h2>
                <p id="late-arrival-subtitle" className="late-arrival-subtitle">
                  Justifiez votre arrivée avant d&apos;accéder à l&apos;application.
                </p>
              </div>
            </header>

            <div className="late-arrival-rh-alert" role="status">
              <AlertTriangle size={16} strokeWidth={2} className="late-arrival-rh-alert__icon" aria-hidden />
              <div>
                <p className="late-arrival-rh-alert__title">Validation requise avant accès</p>
                <p className="late-arrival-rh-alert__text">
                  Votre déclaration sera transmise au service RH et conservée dans votre historique de présence.
                </p>
              </div>
            </div>

            <EmployeeDelaySummary {...employee} />

            <fieldset className="late-arrival-fieldset">
              <legend className="late-arrival-legend">Cause du retard *</legend>
              <OrionRadioCardGroup
                name="late-cause"
                value={cause}
                onChange={onCauseChange}
                options={causeOptions}
                tone="light"
                compact
                className="late-arrival-causes-grid"
              />
            </fieldset>

            <AnimatePresence>
              {isAutre ? (
                <motion.div
                  key="remarks-autre"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="late-arrival-remarks late-arrival-remarks--highlight overflow-hidden"
                >
                  <label htmlFor="late-arrival-remarks" className="late-arrival-remarks-label">
                    Précision requise
                    <span className="late-arrival-remarks-hint"> — décrivez brièvement le motif</span>
                  </label>
                  <textarea
                    id="late-arrival-remarks"
                    className="late-arrival-textarea"
                    placeholder="Ajoutez une précision si nécessaire…"
                    value={remarque}
                    onChange={(e) => onRemarqueChange(e.target.value)}
                    aria-required
                    aria-invalid={!!error && isAutre && !remarque.trim()}
                    aria-describedby={error ? remarksErrorId : undefined}
                    rows={2}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {error ? (
                <motion.p
                  id={remarksErrorId}
                  key="late-error"
                  className="late-arrival-error"
                  role="alert"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          <footer className="late-arrival-footer">
            <button
              type="button"
              className={`late-arrival-cta orion-ux-press${saving ? ' late-arrival-cta--loading' : ''}`}
              disabled={saving || !cause || (isAutre && !remarque.trim())}
              onClick={onSubmit}
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" aria-hidden />
                  Validation en cours…
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} strokeWidth={2.25} aria-hidden />
                  Valider et accéder à l&apos;application
                </>
              )}
            </button>
            <p className="late-arrival-helper">{footerHelper}</p>
          </footer>
        </>
      )}
    </motion.div>
  );
}
