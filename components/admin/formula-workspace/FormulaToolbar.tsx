'use client';

import { RotateCcw, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { cn } from '@/lib/utils';

export type FormulaBusinessState =
  | 'actif'
  | 'inactif'
  | 'a_completer'
  | 'erreur'
  | 'synchronise'
  | 'sync_failed';

const STATE_LABEL: Record<FormulaBusinessState, string> = {
  actif: 'Actif',
  inactif: 'Inactif',
  a_completer: 'À compléter',
  erreur: 'Erreur',
  synchronise: 'Synchronisé',
  sync_failed: 'Synchronisation échouée',
};

type HeadProps = {
  title: string;
  meta?: string | null;
  businessState: FormulaBusinessState;
  syncLabel: string;
  lastModified?: string | null;
  dirty: boolean;
};

/** En-tête du canvas : nom du profil + consigne + badges d'état. */
export function FormulaCanvasHead({
  title,
  meta,
  businessState,
  syncLabel,
  lastModified,
  dirty,
}: HeadProps) {
  const stateTone =
    businessState === 'synchronise' || businessState === 'actif'
      ? 'tone-ok'
      : businessState === 'erreur' || businessState === 'sync_failed'
        ? 'tone-danger'
        : businessState === 'a_completer'
          ? 'tone-warn'
          : '';
  const syncTone = businessState === 'synchronise' ? 'tone-ok' : dirty ? 'tone-warn' : '';

  return (
    <div className="fw-canvas-head">
      <div className="min-w-0">
        <h2 className="fw-canvas-head__title truncate">{title}</h2>
        <p className="fw-canvas-head__sub">
          Ordre du calcul — glissez les blocs pour réorganiser
          {meta ? <span className="fw-canvas-head__meta"> · {meta}</span> : null}
        </p>
      </div>
      <div className="fw-canvas-head__badges">
        <span className={cn('fw-badge', stateTone)}>{STATE_LABEL[businessState]}</span>
        <span className={cn('fw-badge', syncTone)}>{syncLabel}</span>
        {dirty ? <span className="fw-badge tone-warn">Non enregistré</span> : null}
        {lastModified ? (
          <span className="fw-badge">
            Maj. {new Date(lastModified).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type FooterProps = {
  dirty: boolean;
  canEdit: boolean;
  applying: boolean;
  savingDraft: boolean;
  syncing?: boolean;
  applyBlockedReason?: string | null;
  onDiscard: () => void;
  onSaveWithoutActivate: () => void;
  /** Active la version (Admin) — ne synchronise pas le POS. */
  onActivate: () => void;
  /** Synchronise Admin → POS après activation. */
  onSyncPos: () => void;
  activateLabel?: string;
  activateTitle?: string;
};

/** Pied d'actions sticky du canvas : Annuler à gauche, actions à droite. */
export function FormulaFooterActions({
  dirty,
  canEdit,
  applying,
  savingDraft,
  syncing = false,
  applyBlockedReason,
  onDiscard,
  onSaveWithoutActivate,
  onActivate,
  onSyncPos,
  activateLabel = 'Enregistrer et activer',
  activateTitle = 'Enregistre puis active la version Admin — sans sync POS automatique',
}: FooterProps) {
  if (!canEdit) return null;
  const busy = applying || savingDraft || syncing;

  return (
    <div className="fw-footer" role="toolbar" aria-label="Actions formule">
      <div className="fw-footer__left">
        <AppButton type="button" variant="ghost" disabled={!dirty || busy} onClick={onDiscard}>
          <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Annuler</span>
        </AppButton>
      </div>
      <div className="fw-footer__actions">
        <AppButton
          type="button"
          variant="outline"
          disabled={!dirty || busy}
          title="Enregistre un brouillon — POS inchangé"
          onClick={onSaveWithoutActivate}
        >
          <Save className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{savingDraft && !applying ? 'Enregistrement…' : 'Brouillon'}</span>
        </AppButton>
        <AppButton
          type="button"
          variant="outline"
          disabled={busy}
          title="Projette vers le Commercial / POS puis vérifie la parité"
          onClick={onSyncPos}
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{syncing ? 'Sync…' : 'Sync POS'}</span>
        </AppButton>
        <AppButton
          type="button"
          variant="default"
          disabled={busy || Boolean(applyBlockedReason)}
          title={applyBlockedReason ?? activateTitle}
          onClick={onActivate}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{applying ? 'Application…' : activateLabel}</span>
        </AppButton>
      </div>
    </div>
  );
}
