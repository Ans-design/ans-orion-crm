'use client';

/**
 * Fiche créneau — style ANS_Fiche_Creneau_Moderne.html
 * Radius ORION 7px · 1 clic focus / double-clic ouvre cette fiche.
 */

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { GanttSlot } from '@/components/planning/production-gantt';
import {
  resolveGanttSlotProgress,
  planningGradientForCommande,
  planningFocusTint,
} from '@/lib/planning/planning-ui';

export type SlotDetailEdit = {
  statut: string;
  operateur: string;
  machine: string;
  /** HH:mm local — début / fin (éditable sans étirer le Gantt). */
  startTime: string;
  endTime: string;
};

type Operator = { id: string; name: string; role: string };

type Props = {
  slot: GanttSlot | null;
  edit: SlotDetailEdit;
  onEditChange: (patch: Partial<SlotDetailEdit>) => void;
  etapes: string[];
  operators: Operator[];
  onClose: () => void;
  onSave: () => void;
  /** Applique les heures sur le Gantt (longueur / position). */
  onApplyTimes?: (startTime: string, endTime: string) => void;
  /** Sync immédiate Intervenant / État → Gantt + pool. */
  onApplyMeta?: (patch: { statut?: string; operateur?: string }) => void;
  onValidate: () => void;
  onDelete: () => void;
  onOpenCommande?: () => void;
};

/** HH:mm depuis un ISO (fuseau local). */
export function isoToTimeInput(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '08:00';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Recompose startAt / endAt ISO à partir des heures saisies.
 * Conserve le jour du créneau ; si fin ≤ début (shift nuit), +1 jour sur la fin.
 */
export function buildSlotTimesFromEdit(
  slot: Pick<GanttSlot, 'startAt' | 'endAt'>,
  startTime: string,
  endTime: string,
): { startAt: string; endAt: string } | null {
  const startParts = startTime.split(':').map((x) => Number(x));
  const endParts = endTime.split(':').map((x) => Number(x));
  const sh = startParts[0];
  const sm = startParts[1];
  const eh = endParts[0];
  const em = endParts[1];
  if (
    sh == null || sm == null || eh == null || em == null
    || ![sh, sm, eh, em].every((n) => Number.isFinite(n))
  ) {
    return null;
  }

  const start = new Date(slot.startAt);
  if (!Number.isFinite(start.getTime())) return null;
  start.setHours(sh, sm, 0, 0);

  const end = new Date(slot.endAt);
  if (!Number.isFinite(end.getTime())) return null;
  // Ancrer la fin sur le même jour civil que le début, puis corriger nuit / durée
  end.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
  end.setHours(eh, em, 0, 0);
  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

const STATUSES = [
  { id: 'Planifié', label: 'Planifié', dot: '#f7255b' },
  { id: 'En cours', label: 'En cours', dot: '#e09a16' },
  { id: 'Terminé', label: 'Terminé', dot: '#14a978' },
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function durationLabel(startAt: string, endAt: string): string {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  if (h <= 0) return `${m} min`;
  if (m <= 0) return `${h} h`;
  return `${h} h ${m} min`;
}

const timeInputClass =
  'w-[7.25rem] bg-transparent border-0 border-b-2 border-[#d5deec] dark:border-border p-0 pb-0.5 text-[25px] font-bold tabular-nums text-[#182238] dark:text-foreground outline-none focus:border-[#3b72f2] [color-scheme:light] dark:[color-scheme:dark]';

export function PlanningSlotDetailModal({
  slot,
  edit,
  onEditChange,
  etapes,
  operators,
  onClose,
  onSave,
  onApplyTimes,
  onApplyMeta,
  onValidate,
  onDelete,
  onOpenCommande,
}: Props) {
  const open = Boolean(slot);
  const assignee = edit.operateur.trim();
  const knownOp = operators.find((o) => o.name === assignee);

  const titleParts = useMemo(() => {
    if (!slot) return { code: '', rest: '' };
    const raw = slot.title || '';
    const sep = raw.includes(' · ') ? ' · ' : raw.includes(' - ') ? ' - ' : null;
    if (!sep) return { code: raw, rest: '' };
    const [code, ...rest] = raw.split(sep);
    return { code: code?.trim() || raw, rest: rest.join(sep).trim() };
  }, [slot]);

  const activeStepIdx = useMemo(() => {
    const i = etapes.indexOf(edit.machine);
    return i >= 0 ? i : 0;
  }, [etapes, edit.machine]);

  const progress = useMemo(() => {
    if (typeof slot?.progress === 'number' && Number.isFinite(slot.progress)) {
      return resolveGanttSlotProgress({ taskProgress: slot.progress, slotStatut: edit.statut });
    }
    if (etapes.length > 1) {
      return Math.round(((activeStepIdx + 1) / etapes.length) * 100);
    }
    return resolveGanttSlotProgress({ slotStatut: edit.statut });
  }, [activeStepIdx, etapes.length, edit.statut, slot?.progress]);

  const grad = useMemo(
    () => planningGradientForCommande(slot?.commandeId, slot?.title, slot?.id),
    [slot],
  );
  const tint = useMemo(() => planningFocusTint(grad), [grad]);

  const liveTimes = useMemo(() => {
    if (!slot) return null;
    return buildSlotTimesFromEdit(slot, edit.startTime, edit.endTime);
  }, [slot, edit.startTime, edit.endTime]);

  const commitTimes = (startTime: string, endTime: string) => {
    onEditChange({ startTime, endTime });
    onApplyTimes?.(startTime, endTime);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'max-w-[760px] w-[min(760px,calc(100vw-1.5rem))] gap-0 overflow-hidden border-0 p-0',
          'bg-white dark:bg-card shadow-[0_30px_90px_rgba(27,37,56,0.25)]',
          '[&>button]:hidden',
        )}
        style={{ borderRadius: 7 }}
      >
        <DialogTitle className="sr-only">Fiche créneau</DialogTitle>
        <DialogDescription className="sr-only">
          Édition du créneau de planification production
        </DialogDescription>

        {/* Header */}
        <header
          className="min-h-[100px] px-6 py-5 grid grid-cols-[48px_1fr_auto_34px] gap-4 items-center border-b border-[#f1e8ec] dark:border-border"
          style={{ background: `linear-gradient(115deg, #fff 45%, ${tint.border})` }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[7px] text-[22px] font-black shadow-[0_8px_24px_rgba(247,37,91,0.14)]"
            style={{
              background: `linear-gradient(145deg, color-mix(in srgb, ${grad.c1} 12%, white), color-mix(in srgb, ${grad.c1} 22%, white))`,
              color: grad.c1,
            }}
            aria-hidden
          >
            ≋
          </div>
          <div className="min-w-0">
            <small className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#71809a]">
              Fiche créneau
            </small>
            <h2 className="m-0 mt-1 text-[21px] font-bold tracking-tight text-[#182238] dark:text-foreground truncate">
              {titleParts.code || slot?.title}
            </h2>
            {titleParts.rest ? (
              <span className="text-[#71809a] text-[13px] truncate block">{titleParts.rest}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <span
              className="rounded-[7px] px-2.5 py-2 text-[11px] font-bold"
              style={{ background: tint.badgeBg, color: tint.badgeFg }}
            >
              ● {edit.statut || 'Planifié'}
            </span>
            {edit.machine ? (
              <span className="rounded-[7px] px-2.5 py-2 text-[11px] font-bold bg-white border border-[#ffc7d4] text-[#cf1748] dark:bg-card dark:border-border dark:text-foreground">
                {edit.machine}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[7px] text-[#7a879c] hover:bg-[#f2f5f9] dark:hover:bg-muted text-2xl leading-none"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Progress */}
        <div
          className="px-6 py-3.5 border-b border-[#f4ecef] dark:border-border"
          style={{ background: tint.background }}
        >
          <div className="flex justify-between mb-2 text-[11px]">
            <strong className="uppercase tracking-[0.08em] text-[#182238] dark:text-foreground">
              Avancement · étape {Math.min(activeStepIdx + 1, etapes.length || 1)} sur {etapes.length || 1}
            </strong>
            <span className="font-bold tabular-nums" style={{ color: grad.c1 }}>
              {progress}%
            </span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-[#edf0f5] dark:bg-muted">
            <i
              className="block h-full rounded-full"
              style={{ width: `${progress}%`, background: tint.fill }}
              aria-hidden
            />
          </div>
        </div>

        <div className="px-6 py-5 grid gap-4 max-h-[min(70vh,640px)] overflow-y-auto">
          {/* Temps — éditable (alternative au resize Gantt) */}
          {slot ? (
            <section className="min-h-[82px] px-4 py-3.5 grid grid-cols-[42px_1fr_auto] gap-3.5 items-center rounded-[7px] border border-[#dfe5ef] dark:border-border bg-gradient-to-br from-[#f9fbfe] to-white dark:from-muted/20 dark:to-card">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[7px] bg-[#eef3fa] text-[#647899] text-xl dark:bg-muted" aria-hidden>
                ◷
              </div>
              <div>
                <small className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#71809a]">
                  Créneau de production · cliquer pour modifier
                </small>
                <div className="flex items-center gap-3 mt-1">
                  <label className="sr-only" htmlFor="slot-start-time">
                    Heure de début
                  </label>
                  <input
                    id="slot-start-time"
                    type="time"
                    step={300}
                    value={edit.startTime}
                    onChange={(e) => onEditChange({ startTime: e.target.value })}
                    onBlur={(e) => commitTimes(e.target.value, edit.endTime)}
                    className={timeInputClass}
                  />
                  <span className="text-[#8c9ab0]">→</span>
                  <label className="sr-only" htmlFor="slot-end-time">
                    Heure de fin
                  </label>
                  <input
                    id="slot-end-time"
                    type="time"
                    step={300}
                    value={edit.endTime}
                    onChange={(e) => onEditChange({ endTime: e.target.value })}
                    onBlur={(e) => commitTimes(edit.startTime, e.target.value)}
                    className={timeInputClass}
                  />
                </div>
              </div>
              <span className="rounded-[7px] border border-[#e5eaf2] bg-white px-2.5 py-1.5 text-[12px] font-extrabold text-[#5e6e87] shadow-sm dark:bg-card dark:border-border tabular-nums">
                {liveTimes
                  ? durationLabel(liveTimes.startAt, liveTimes.endAt)
                  : durationLabel(slot.startAt, slot.endAt)}
              </span>
            </section>
          ) : null}

          {/* Étapes flux */}
          <section className="overflow-hidden rounded-[7px] border border-[#e5eaf2] dark:border-border">
            <div className="min-h-[46px] px-3.5 flex items-center justify-between bg-[#fafbfd] border-b border-[#edf0f5] dark:bg-muted/20 dark:border-border">
              <div className="flex items-center gap-2">
                <span aria-hidden>▱</span>
                <strong className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#71809a]">
                  Production & flux
                </strong>
              </div>
              <span className="text-[10px] text-[#97a2b4]">Choisissez l&apos;étape actuelle</span>
            </div>
            <div
              className="p-3 grid gap-1.5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))' }}
              role="listbox"
              aria-label="Étape"
            >
              {etapes.map((name, i) => {
                const done = i < activeStepIdx;
                const current = i === activeStepIdx;
                return (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={current}
                    onClick={() => onEditChange({ machine: name })}
                    className={cn(
                      'min-h-[49px] px-2 py-1.5 grid grid-cols-[20px_1fr] gap-1.5 items-center text-left rounded-[7px] border transition-all',
                      current
                        ? 'border-[#ff9fb6] bg-[#fff0f4] text-[#ce1747] shadow-[inset_0_0_0_1px_#ffd2dc]'
                        : 'border-[#e5eaf2] bg-white text-[#697991] hover:-translate-y-px hover:shadow-sm dark:bg-card dark:border-border',
                    )}
                  >
                    <i
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-[6px] text-[8px] font-bold tabular-nums not-italic',
                        done && !current && 'bg-[#e7f7f1] text-[#14a978]',
                        current && 'text-white',
                        !done && !current && 'bg-[#f1f4f8] text-[#697991]',
                      )}
                      style={current ? { background: grad.c1 } : undefined}
                    >
                      {done && !current ? '✓' : String(i + 1).padStart(2, '0')}
                    </i>
                    <span className="text-[10px] font-bold leading-tight line-clamp-2">{name}</span>
                  </button>
                );
              })}
              {edit.machine && !etapes.includes(edit.machine) ? (
                <span className="min-h-[49px] px-2 py-1.5 flex items-center rounded-[7px] border border-border bg-muted text-[10px] font-bold">
                  {edit.machine}
                </span>
              ) : null}
            </div>
          </section>

          {/* Intervenant + État */}
          <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-3.5">
            <section className="overflow-hidden rounded-[7px] border border-[#e5eaf2] dark:border-border">
              <div className="min-h-[43px] px-3.5 flex items-center justify-between bg-[#fafbfd] border-b border-[#edf0f5] dark:bg-muted/20 dark:border-border">
                <div className="flex items-center gap-2">
                  <span aria-hidden>♙</span>
                  <strong className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#71809a]">
                    Intervenant
                  </strong>
                </div>
                <span className="text-[10px] text-[#97a2b4]">Responsable du créneau</span>
              </div>
              <div className="px-3.5 pt-3.5 pb-2 grid grid-cols-[38px_1fr] gap-2.5 items-end">
                <div
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-[7px] text-[12px] font-extrabold"
                  style={{
                    background: assignee ? tint.badgeBg : '#f0f4fa',
                    color: assignee ? tint.badgeFg : '#6b7e9d',
                  }}
                  aria-hidden
                >
                  {assignee ? initials(assignee) : '?'}
                </div>
                <label className="block min-w-0">
                  <span className="block mb-1 text-[9px] font-bold text-[#8a97aa] uppercase">
                    Personne assignée
                  </span>
                  {operators.length > 0 ? (
                    <select
                      className="w-full h-[38px] px-2.5 rounded-[7px] border border-[#dfe5ee] bg-white text-sm outline-none dark:bg-card dark:border-border"
                      value={knownOp ? assignee : ''}
                      onChange={(e) => {
                        const operateur = e.target.value;
                        onEditChange({ operateur });
                        onApplyMeta?.({ operateur });
                      }}
                      aria-label="Choisir un intervenant"
                    >
                      <option value="">— Non assigné —</option>
                      {operators.map((op) => (
                        <option key={op.id} value={op.name}>
                          {op.name} · {op.role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full h-[38px] px-2.5 rounded-[7px] border border-[#dfe5ee] bg-white text-sm outline-none dark:bg-card dark:border-border"
                      value={assignee}
                      onChange={(e) => onEditChange({ operateur: e.target.value })}
                      onBlur={(e) => onApplyMeta?.({ operateur: e.target.value })}
                      placeholder="Nom de l'intervenant"
                    />
                  )}
                </label>
              </div>
              {operators.length > 0 ? (
                <input
                  className="w-[calc(100%-3.5rem)] ml-[3.5rem] mb-3.5 h-[38px] px-2.5 rounded-[7px] border border-[#dfe5ee] bg-white text-xs outline-none dark:bg-card dark:border-border"
                  value={assignee}
                  onChange={(e) => onEditChange({ operateur: e.target.value })}
                  onBlur={(e) => onApplyMeta?.({ operateur: e.target.value })}
                  placeholder="Ou saisir un nom…"
                  aria-label="Nom libre"
                />
              ) : null}
            </section>

            <section className="overflow-hidden rounded-[7px] border border-[#e5eaf2] dark:border-border">
              <div className="min-h-[43px] px-3.5 flex items-center justify-between bg-[#fafbfd] border-b border-[#edf0f5] dark:bg-muted/20 dark:border-border">
                <div className="flex items-center gap-2">
                  <span aria-hidden>◉</span>
                  <strong className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#71809a]">
                    État du créneau
                  </strong>
                </div>
                <span className="text-[10px] text-[#97a2b4]">Mise à jour</span>
              </div>
              <div className="p-3 grid gap-1.5" role="radiogroup" aria-label="État">
                {STATUSES.map((st) => {
                  const selected = edit.statut === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        onEditChange({ statut: st.id });
                        onApplyMeta?.({ statut: st.id });
                      }}
                      className={cn(
                        'h-9 px-2.5 grid grid-cols-[8px_1fr_14px] items-center gap-2 text-left rounded-[7px] border text-[10px] font-bold transition-colors',
                        selected
                          ? 'bg-[#f9fbfd] border-[#cfd7e4] text-[#182238] dark:bg-muted/30 dark:border-border dark:text-foreground'
                          : 'bg-white border-[#e7ebf1] text-[#65758d] dark:bg-card dark:border-border',
                      )}
                    >
                      <i className="block h-[7px] w-[7px] rounded-full" style={{ background: st.dot }} aria-hidden />
                      {st.label}
                      <b className="text-[#f7255b] font-bold" aria-hidden>
                        {selected ? '✓' : ''}
                      </b>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="min-h-[82px] px-6 py-3.5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#e5eaf2] bg-[#fbfcfe] dark:bg-muted/15 dark:border-border">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            {onOpenCommande ? (
              <button
                type="button"
                onClick={onOpenCommande}
                className="border-0 bg-transparent text-[#66768f] text-[10px] font-bold px-1 py-1 hover:text-[#182238]"
              >
                ↗ Voir commande
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              className="border-0 bg-transparent text-[#e32955] text-[10px] font-bold px-1 py-1"
            >
              ♧ Supprimer
            </button>
          </div>
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={onSave}
              className="flex-1 sm:flex-initial h-[42px] px-5 rounded-[7px] border border-[#dce3ed] bg-white text-[#354158] text-[11px] font-extrabold dark:bg-card dark:border-border dark:text-foreground"
            >
              ▣ Enregistrer
            </button>
            <button
              type="button"
              onClick={onValidate}
              className="flex-1 sm:min-w-[180px] h-[42px] px-5 rounded-[7px] border-0 text-white text-[11px] font-extrabold shadow-[0_9px_22px_rgba(238,23,78,0.22)] inline-flex items-center justify-center gap-1.5 hover:-translate-y-px transition-transform"
              style={{ background: `linear-gradient(135deg, ${grad.c1}, ${grad.c2})` }}
            >
              <Check size={14} /> Valider le créneau
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
