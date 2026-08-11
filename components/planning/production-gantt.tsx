'use client';

/**
 * Timeline Gantt — un shift à la fois : Jour 08–17 ou Nuit 17–08 (j+1).
 * Largeur auto (pas de scroll horizontal).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  planningBarOpacity,
  planningGradientForCommande,
  planningGradientForEtape,
  resolveGanttSlotProgress,
} from '@/lib/planning/planning-ui';

export type GanttSlot = {
  id: string;
  title: string;
  machine: string | null;
  operateur: string | null;
  startAt: string;
  endAt: string;
  statut: string;
  commandeId?: string | null;
  /** % réel (tâches / avancement commande) — sinon dérivé du statut créneau */
  progress?: number | null;
};

export type GanttExternalDrop = {
  commandeId: string;
  resource: string;
  startAt: string;
  endAt: string;
};

export type GanttShiftMode = 'day' | 'night';

type Props = {
  slots: GanttSlot[];
  date: Date;
  /** Shift affiché (pas les deux en même temps). */
  shiftMode?: GanttShiftMode;
  /** @deprecated Largeur auto — ignoré (compat). */
  zoom?: number;
  resources?: string[];
  resourceHints?: Record<string, string>;
  onSlotClick?: (slot: GanttSlot) => void;
  onSlotDoubleClick?: (slot: GanttSlot) => void;
  onSlotUpdate?: (
    id: string,
    patch: Partial<Pick<GanttSlot, 'startAt' | 'endAt' | 'machine' | 'operateur' | 'statut' | 'title'>>,
  ) => Promise<void>;
  onExternalDrop?: (drop: GanttExternalDrop) => Promise<void> | void;
  externalDropDurationHours?: number;
  onSlotUnplanDragStart?: (slot: GanttSlot, e: React.DragEvent) => void;
  onSlotUnplanDragEnd?: () => void;
};

/** Shift jour : 08:00 → 17:00 */
export const SHIFT_DAY_START = 8;
export const SHIFT_DAY_END = 17;
/** Shift nuit : 17:00 → 08:00 j+1 */
export const SHIFT_NIGHT_START = 17;
export const SHIFT_NIGHT_END = 8;

const SNAP_MIN = 15;
const DEFAULT_DURATION_H = 3;
const ROW_HEIGHT = 62;
const LABEL_W = 200;
const MIN_PX_PER_HOUR = 36;

const DEFAULT_RESOURCES = ['Impression', 'Façonnage', 'Contrôle qualité'];

function shiftBounds(day: Date, mode: GanttShiftMode): { start: Date; end: Date; hours: number } {
  if (mode === 'day') {
    const start = new Date(day);
    start.setHours(SHIFT_DAY_START, 0, 0, 0);
    const end = new Date(day);
    end.setHours(SHIFT_DAY_END, 0, 0, 0);
    return { start, end, hours: SHIFT_DAY_END - SHIFT_DAY_START };
  }
  const start = new Date(day);
  start.setHours(SHIFT_NIGHT_START, 0, 0, 0);
  const end = new Date(day);
  end.setDate(end.getDate() + 1);
  end.setHours(SHIFT_NIGHT_END, 0, 0, 0);
  return { start, end, hours: (24 - SHIFT_NIGHT_START) + SHIFT_NIGHT_END };
}

function dateToOffset(d: Date, day: Date, mode: GanttShiftMode): number {
  const { start } = shiftBounds(day, mode);
  return (d.getTime() - start.getTime()) / 3_600_000;
}

function offsetToDate(day: Date, offsetHours: number, mode: GanttShiftMode): Date {
  const { start } = shiftBounds(day, mode);
  return new Date(start.getTime() + offsetHours * 3_600_000);
}

function snapOffset(offset: number, maxHours: number): number {
  const totalMin = offset * 60;
  const snapped = Math.round(totalMin / SNAP_MIN) * SNAP_MIN;
  return Math.max(0, Math.min(maxHours, snapped / 60));
}

function overlapsShift(startAt: string, endAt: string, day: Date, mode: GanttShiftMode): boolean {
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  const { start, end } = shiftBounds(day, mode);
  return e > start.getTime() && s < end.getTime();
}

function hourLabelFromOffset(day: Date, offset: number, mode: GanttShiftMode): string {
  const d = offsetToDate(day, offset, mode);
  return `${String(d.getHours()).padStart(2, '0')}h`;
}

function splitTitle(title: string): { primary: string; secondary: string } {
  const sep = title.includes(' · ') ? ' · ' : title.includes(' - ') ? ' - ' : null;
  if (!sep) return { primary: title, secondary: '' };
  const [a, ...rest] = title.split(sep);
  return { primary: a?.trim() || title, secondary: rest.join(sep).trim() };
}

type DragState = {
  slotId: string;
  mode: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  startY: number;
  origLeft: number;
  origWidth: number;
  origRow: number;
};

type PreviewState = { id: string; left: number; width: number; row: number };
type ExternalHover = { row: number; left: number; width: number };

export function ProductionGantt({
  slots,
  date,
  shiftMode = 'day',
  resources,
  resourceHints,
  onSlotClick,
  onSlotDoubleClick,
  onSlotUpdate,
  onExternalDrop,
  externalDropDurationHours = DEFAULT_DURATION_H,
  onSlotUnplanDragStart,
  onSlotUnplanDragEnd,
}: Props) {
  const bounds = useMemo(() => shiftBounds(date, shiftMode), [date, shiftMode]);
  const windowHours = bounds.hours;

  /** Bornes horaires inclusives (ex. 08h…17h) — le dernier marque la fin exacte. */
  const hourBoundaries = useMemo(() => {
    const list: { offset: number; label: string }[] = [];
    for (let i = 0; i <= windowHours; i++) {
      list.push({ offset: i, label: hourLabelFromOffset(date, i, shiftMode) });
    }
    return list;
  }, [date, shiftMode, windowHours]);

  const quarterTickCount = windowHours * 4;

  const rows = useMemo(() => {
    const fromSlots = [...new Set(slots.map((s) => s.machine || 'Non assigné'))];
    const base = resources?.length ? resources : DEFAULT_RESOURCES;
    return [...new Set([...base, ...fromSlots.filter((r) => r !== 'Non assigné' || base.length === 0)])];
  }, [slots, resources]);

  const daySlots = useMemo(
    () => slots.filter((s) => overlapsShift(s.startAt, s.endAt, date, shiftMode)),
    [slots, date, shiftMode],
  );

  const shellRef = useRef<HTMLDivElement>(null);
  const [pxPerHour, setPxPerHour] = useState(56);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - LABEL_W;
      if (w <= 0) return;
      setPxPerHour(Math.max(MIN_PX_PER_HOUR, w / windowHours));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [windowHours]);

  const totalWidth = windowHours * pxPerHour;

  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const now = useMemo(() => {
    void nowTick;
    return new Date();
  }, [nowTick]);
  const nowOffset = dateToOffset(now, date, shiftMode);
  const showNow = nowOffset >= 0 && nowOffset <= windowHours;
  const nowLeft = showNow ? nowOffset * pxPerHour : null;
  const nowLabel = showNow
    ? now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);
  useEffect(() => {
    if (!justPlacedId) return;
    const t = window.setTimeout(() => setJustPlacedId(null), 700);
    return () => window.clearTimeout(t);
  }, [justPlacedId]);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [externalHover, setExternalHover] = useState<ExternalHover | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const previewRef = useRef<PreviewState | null>(null);
  const savingRef = useRef(false);
  const didDragRef = useRef(false);

  const getRowFromY = useCallback((clientY: number): number => {
    const grid = gridRef.current;
    if (!grid) return 0;
    const rect = grid.getBoundingClientRect();
    return Math.max(0, Math.min(rows.length - 1, Math.floor((clientY - rect.top) / ROW_HEIGHT)));
  }, [rows.length]);

  const getOffsetFromX = useCallback((clientX: number, timelineEl: HTMLElement): number => {
    const rect = timelineEl.getBoundingClientRect();
    const relX = Math.max(0, Math.min(totalWidth, clientX - rect.left));
    return snapOffset(relX / pxPerHour, windowHours);
  }, [totalWidth, pxPerHour, windowHours]);

  const commitDrag = useCallback(async (state: DragState, left: number, width: number, row: number) => {
    if (!onSlotUpdate || savingRef.current) return;
    const startOff = snapOffset(left / pxPerHour, windowHours);
    const endOff = snapOffset((left + width) / pxPerHour, windowHours);
    if (endOff <= startOff) return;
    const resource = rows[row] ?? rows[0];
    savingRef.current = true;
    try {
      await onSlotUpdate(state.slotId, {
        startAt: offsetToDate(date, startOff, shiftMode).toISOString(),
        endAt: offsetToDate(date, endOff, shiftMode).toISOString(),
        machine: resource,
      });
      setJustPlacedId(state.slotId);
    } finally {
      savingRef.current = false;
    }
  }, [date, onSlotUpdate, rows, pxPerHour, windowHours, shiftMode]);

  const startDrag = (
    e: React.PointerEvent,
    slot: GanttSlot,
    mode: DragState['mode'],
    left: number,
    width: number,
    row: number,
  ) => {
    if (!onSlotUpdate) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const state: DragState = {
      slotId: slot.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: left,
      origWidth: width,
      origRow: row,
    };
    dragRef.current = state;
    previewRef.current = { id: slot.id, left, width, row };
    setDrag(state);
    setPreview(previewRef.current);

    const minW = pxPerHour * 0.25;

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      let nextLeft = d.origLeft;
      let nextWidth = d.origWidth;
      let nextRow = d.origRow;

      if (d.mode === 'move') {
        nextLeft = Math.max(0, Math.min(totalWidth - d.origWidth, d.origLeft + dx));
        nextRow = getRowFromY(ev.clientY);
      } else if (d.mode === 'resize-start') {
        const newLeft = Math.max(0, d.origLeft + dx);
        nextWidth = d.origWidth + (d.origLeft - newLeft);
        nextLeft = newLeft;
        if (nextWidth < minW) {
          nextWidth = minW;
          nextLeft = d.origLeft + d.origWidth - nextWidth;
        }
      } else {
        nextWidth = Math.max(minW, d.origWidth + dx);
        if (nextLeft + nextWidth > totalWidth) nextWidth = totalWidth - nextLeft;
      }

      const next = { id: d.slotId, left: nextLeft, width: nextWidth, row: nextRow };
      previewRef.current = next;
      setPreview(next);
    };

    const onUp = (ev: PointerEvent) => {
      const d = dragRef.current;
      const p = previewRef.current;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dragRef.current = null;
      previewRef.current = null;
      setDrag(null);
      setPreview(null);
      if (!d) return;
      const moved = Math.abs(ev.clientX - d.startX) > 3 || Math.abs(ev.clientY - d.startY) > 3;
      if (!moved || !onSlotUpdate) return;
      didDragRef.current = true;
      void commitDrag(
        d,
        p?.id === d.slotId ? p.left : d.origLeft,
        p?.id === d.slotId ? p.width : d.origWidth,
        p?.id === d.slotId ? p.row : d.origRow,
      );
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const resolveExternalTarget = (e: React.DragEvent): ExternalHover | null => {
    const timeline = (e.currentTarget as HTMLElement).closest('[data-gantt-timeline]') as HTMLElement | null;
    const rowEl = (e.currentTarget as HTMLElement).closest('[data-gantt-row]') as HTMLElement | null;
    if (!timeline || !rowEl) return null;
    const row = Number(rowEl.dataset.rowIndex ?? 0);
    const startOff = getOffsetFromX(e.clientX, timeline);
    const dur = Math.max(0.25, externalDropDurationHours || DEFAULT_DURATION_H);
    const endOff = Math.min(windowHours, startOff + dur);
    return {
      row,
      left: startOff * pxPerHour,
      width: Math.max(pxPerHour * 0.5, (endOff - startOff) * pxPerHour),
    };
  };

  const handleExternalDragOver = (e: React.DragEvent) => {
    if (![...e.dataTransfer.types].includes('application/x-orion-commande')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const hover = resolveExternalTarget(e);
    if (hover) setExternalHover(hover);
  };

  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setExternalHover(null);
    const commandeId = e.dataTransfer.getData('application/x-orion-commande');
    if (!commandeId || !onExternalDrop) return;
    const hover = resolveExternalTarget(e);
    if (!hover) return;
    const resource = rows[hover.row] ?? rows[0] ?? DEFAULT_RESOURCES[0]!;
    const startOff = snapOffset(hover.left / pxPerHour, windowHours);
    const endOff = snapOffset((hover.left + hover.width) / pxPerHour, windowHours);
    await onExternalDrop({
      commandeId,
      resource,
      startAt: offsetToDate(date, startOff, shiftMode).toISOString(),
      endAt: offsetToDate(date, Math.max(startOff + 0.25, endOff), shiftMode).toISOString(),
    });
    setJustPlacedId(commandeId);
  };

  const bandLabel = shiftMode === 'day' ? 'Jour · 08:00–17:00' : 'Nuit · 17:00–08:00';
  const bandCls = shiftMode === 'day'
    ? 'text-[#3769db] bg-[#eef3ff]/80'
    : 'text-[#5b4fcf] bg-[#f3f0ff]/90';
  const tintCls = shiftMode === 'day'
    ? 'bg-[#eef3ff]/35 dark:bg-blue-950/10'
    : 'bg-[#f3f0ff]/45 dark:bg-violet-950/15';

  const renderTaskBar = (
    slot: GanttSlot,
    left: number,
    width: number,
    calcLeft: number,
    calcWidth: number,
    rowIdx: number,
    opts?: { ghost?: boolean; dragging?: boolean },
  ) => {
    const grad = planningGradientForCommande(slot.commandeId, slot.title, slot.id);
    const progress = resolveGanttSlotProgress({
      taskProgress: slot.progress,
      slotStatut: slot.statut,
    });
    const opacity = planningBarOpacity(slot.statut);
    const { primary, secondary } = splitTitle(slot.title);
    const showMeta = width >= pxPerHour * 1.1;
    const barW = Math.max(width - 4, pxPerHour * 0.35);
    const barLeft = left + 2;
    const justPlaced =
      !opts?.ghost
      && (justPlacedId === slot.id || (slot.commandeId != null && justPlacedId === slot.commandeId));

    return (
      <div
        key={opts?.ghost ? `ghost-${slot.id}` : slot.id}
        className={cn(
          'gg-block absolute select-none touch-none overflow-hidden rounded-[7px] text-white',
          'flex items-center gap-2 px-2.5',
          'shadow-[0_9px_20px_rgba(0,0,0,0.12)]',
          'transition-[transform,filter] duration-150',
          opts?.ghost
            ? 'opacity-40 pointer-events-none z-20'
            : 'cursor-grab active:cursor-grabbing z-10 hover:-translate-y-0.5 hover:saturate-110',
          opts?.dragging && 'z-30 -translate-y-0.5',
          justPlaced && 'just-placed',
        )}
        style={{
          left: barLeft,
          width: barW,
          top: 10,
          height: 42,
          maxWidth: totalWidth - barLeft - 4,
          opacity: opts?.ghost ? 0.4 : opacity,
          background: `linear-gradient(100deg, ${grad.c1}, ${grad.c2})`,
          boxShadow: `0 9px 20px color-mix(in srgb, ${grad.c1} 25%, transparent)`,
        }}
        onPointerDown={
          opts?.ghost ? undefined : (e) => startDrag(e, slot, 'move', calcLeft, calcWidth, rowIdx)
        }
        onClick={
          opts?.ghost
            ? undefined
            : (e) => {
                if (didDragRef.current) {
                  didDragRef.current = false;
                  return;
                }
                e.stopPropagation();
                onSlotClick?.(slot);
              }
        }
        onDoubleClick={
          opts?.ghost
            ? undefined
            : (e) => {
                e.stopPropagation();
                didDragRef.current = false;
                onSlotDoubleClick?.(slot);
              }
        }
        title={`${slot.title}${slot.operateur ? ` · ${slot.operateur}` : ''} · ${slot.statut} — clic = focus · double-clic = fiche`}
      >
        {!opts?.ghost && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-10"
              onPointerDown={(e) => startDrag(e, slot, 'resize-start', calcLeft, calcWidth, rowIdx)}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-10"
              onPointerDown={(e) => startDrag(e, slot, 'resize-end', calcLeft, calcWidth, rowIdx)}
            />
          </>
        )}
        <span
          draggable={!opts?.ghost && Boolean(onSlotUnplanDragStart)}
          onPointerDown={(e) => {
            if (onSlotUnplanDragStart) e.stopPropagation();
          }}
          onDragStart={(e) => {
            if (!onSlotUnplanDragStart || opts?.ghost) return;
            e.stopPropagation();
            e.dataTransfer.setData('application/x-orion-slot', slot.id);
            e.dataTransfer.setData('text/plain', slot.title);
            e.dataTransfer.effectAllowed = 'move';
            onSlotUnplanDragStart(slot, e);
          }}
          onDragEnd={() => onSlotUnplanDragEnd?.()}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-white/15 text-[11px]',
            onSlotUnplanDragStart && !opts?.ghost
              ? 'cursor-grab active:cursor-grabbing'
              : 'pointer-events-none',
          )}
          title={onSlotUnplanDragStart ? 'Glisser vers Commandes pour déplanifier' : undefined}
          aria-hidden={!onSlotUnplanDragStart}
        >
          ⠿
        </span>
        <span className="min-w-0 flex-1 truncate pointer-events-none">
          <span className="block truncate text-[10px] font-bold leading-tight">{primary}</span>
          {(secondary || slot.operateur) && showMeta ? (
            <span className="block truncate text-[8px] mt-0.5 opacity-90 font-medium">
              {slot.operateur || secondary}
            </span>
          ) : null}
        </span>
        {showMeta ? (
          <span className="shrink-0 rounded-full bg-white/90 px-1.5 py-1 text-[9px] font-extrabold tabular-nums text-[#455069] pointer-events-none">
            {progress}%
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div
      ref={shellRef}
      className="w-full overflow-hidden"
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setExternalHover(null);
      }}
    >
      <div className="w-full relative">
        <div className="flex border-b border-[#e7ebf3] dark:border-border" style={{ height: 28 }}>
          <div className="shrink-0 border-r border-[#e7ebf3] dark:border-border" style={{ width: LABEL_W }} />
          <div
            className={cn(
              'flex items-center justify-center text-[9px] font-extrabold uppercase tracking-[0.06em]',
              bandCls,
            )}
            style={{ width: totalWidth }}
          >
            {bandLabel}
          </div>
        </div>

        <div
          className="flex z-20 bg-white dark:bg-card border-b border-[#e7ebf3] dark:border-border"
          style={{ height: 40 }}
        >
          <div
            className="shrink-0 px-3 py-2 border-r border-[#e7ebf3] dark:border-border flex flex-col justify-center"
            style={{ width: LABEL_W }}
          >
            <b className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#172033] dark:text-foreground">
              Étapes
            </b>
            <small className="text-[10px] text-[#71809a]">{rows.length} au total</small>
          </div>
          <div className="relative" style={{ width: totalWidth, height: 40 }}>
            {/* Graduations 15 min (sans texte) */}
            {Array.from({ length: quarterTickCount + 1 }, (_, i) => {
              const isHour = i % 4 === 0;
              return (
                <div
                  key={`q-${i}`}
                  className={cn(
                    'absolute bottom-0 pointer-events-none',
                    isHour ? 'h-3.5 w-px bg-[#b8c0d0]' : 'h-1.5 w-px bg-[#d8dde8]',
                  )}
                  style={{ left: (i / 4) * pxPerHour }}
                />
              );
            })}
            {/* Labels horaires : 08h … 17h (fin exacte) */}
            {hourBoundaries.map((h) => {
              const isEnd = h.offset === windowHours;
              const isStart = h.offset === 0;
              return (
                <span
                  key={`lbl-${h.offset}`}
                  className={cn(
                    'absolute top-1.5 text-[9px] font-bold tabular-nums pointer-events-none',
                    shiftMode === 'day' ? 'text-[#5a6a88]' : 'text-[#6b5fd4]',
                    isEnd && 'font-extrabold',
                  )}
                  style={{
                    left: h.offset * pxPerHour,
                    transform: isEnd
                      ? 'translateX(-100%)'
                      : isStart
                        ? 'none'
                        : 'translateX(-50%)',
                    paddingLeft: isStart ? 2 : undefined,
                    paddingRight: isEnd ? 2 : undefined,
                  }}
                >
                  {h.label}
                </span>
              );
            })}
            {nowLeft != null && (
              <div className="gantt-now-badge absolute top-1 z-30 -translate-x-1/2 pointer-events-none" style={{ left: nowLeft }}>
                <span className="rounded-[7px] bg-[#23314d] text-white px-1.5 py-0.5 text-[9px] font-bold tabular-nums shadow-md">
                  {nowLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        <div ref={gridRef} className="relative">
          <div
            className={cn('absolute top-0 bottom-0 z-0 pointer-events-none', tintCls)}
            style={{ left: LABEL_W, width: totalWidth }}
          />

          {showNow && nowLeft != null && (
            <>
              <div
                className="absolute top-0 bottom-0 z-[1] pointer-events-none bg-[#fff9e9]/80 dark:bg-amber-900/10"
                style={{
                  left: LABEL_W + Math.max(0, nowLeft - pxPerHour * 0.35),
                  width: pxPerHour * 1.2,
                }}
              />
              <div
                className="gantt-now-line absolute top-0 bottom-0 w-0.5 z-[5] pointer-events-none bg-[#3f75f3]"
                style={{ left: LABEL_W + nowLeft }}
                data-now={nowLabel}
              />
            </>
          )}

          {rows.map((resource, rowIdx) => {
            const rowSlots = daySlots.filter((s) => (s.machine || 'Non assigné') === resource);
            const isDropTarget =
              (preview && preview.row === rowIdx)
              || (externalHover && externalHover.row === rowIdx);
            const etapeGrad = planningGradientForEtape(rowIdx);
            const hint =
              resourceHints?.[resource]
              ?? (rowSlots.length > 0
                ? `${rowSlots.length} créneau${rowSlots.length > 1 ? 's' : ''}`
                : '—');

            return (
              <div
                key={resource}
                data-gantt-row
                data-row-index={rowIdx}
                className={cn(
                  'flex relative',
                  rowIdx % 2 === 1 && 'bg-[#fbfcfe]/60 dark:bg-muted/10',
                  isDropTarget && 'bg-[#eef3ff]/80 dark:bg-primary/5',
                )}
                style={{ height: ROW_HEIGHT }}
              >
                <div
                  className="shrink-0 flex items-center gap-2.5 px-3 border-r border-b border-[#e7ebf3] dark:border-border z-[2] bg-inherit"
                  style={{ width: LABEL_W }}
                  title={resource}
                >
                  <span
                    className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[7px] text-[10px] font-extrabold tabular-nums"
                    style={{
                      background: `color-mix(in srgb, ${etapeGrad.c1} 16%, white)`,
                      color: etapeGrad.c2,
                    }}
                  >
                    {String(rowIdx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <b
                      className="block text-[11px] font-bold truncate"
                      style={{ color: etapeGrad.c2 }}
                    >
                      {resource}
                    </b>
                    <small className="block mt-0.5 text-[9px] text-[#8a95a8] truncate">{hint}</small>
                  </div>
                </div>

                <div
                  data-gantt-timeline
                  className="relative border-b border-[#e7ebf3] dark:border-border"
                  style={{
                    width: totalWidth,
                    height: ROW_HEIGHT,
                    backgroundImage: [
                      `repeating-linear-gradient(90deg, rgba(15,23,42,0.09) 0px, rgba(15,23,42,0.09) 1px, transparent 1px, transparent ${pxPerHour}px)`,
                      `repeating-linear-gradient(90deg, rgba(15,23,42,0.045) 0px, rgba(15,23,42,0.045) 1px, transparent 1px, transparent ${pxPerHour / 4}px)`,
                    ].join(', '),
                  }}
                  onDragOver={handleExternalDragOver}
                  onDrop={(e) => void handleExternalDrop(e)}
                >
                  {externalHover && externalHover.row === rowIdx && (
                    <div
                      className="absolute top-2.5 h-[42px] rounded-[7px] border border-dashed border-[#3b72f2]/60 bg-[#3b72f2]/10 z-[8] pointer-events-none"
                      style={{ left: externalHover.left + 2, width: Math.max(externalHover.width - 4, 40) }}
                    />
                  )}

                  {rowSlots.map((slot) => {
                    const isPreviewHere = preview?.id === slot.id && preview.row === rowIdx;
                    const start = new Date(slot.startAt);
                    const end = new Date(slot.endAt);
                    const startOff = Math.max(0, dateToOffset(start, date, shiftMode));
                    const endOff = Math.min(windowHours, dateToOffset(end, date, shiftMode));
                    const calcLeft = startOff * pxPerHour;
                    const calcWidth = Math.max(pxPerHour * 0.4, (endOff - startOff) * pxPerHour);
                    if (preview && preview.id === slot.id && preview.row !== rowIdx) return null;
                    return renderTaskBar(
                      slot,
                      isPreviewHere ? preview.left : calcLeft,
                      isPreviewHere ? preview.width : calcWidth,
                      calcLeft,
                      calcWidth,
                      rowIdx,
                      { dragging: drag?.slotId === slot.id },
                    );
                  })}

                  {preview && preview.row === rowIdx && !rowSlots.some((s) => s.id === preview.id) && (() => {
                    const slot = daySlots.find((s) => s.id === preview.id);
                    if (!slot) return null;
                    return renderTaskBar(slot, preview.left, preview.width, preview.left, preview.width, rowIdx, {
                      ghost: true,
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {daySlots.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-bold text-[#172033] dark:text-foreground">Timeline libre</p>
            <p className="text-xs text-[#71809a] mt-1">
              {shiftMode === 'day'
                ? 'Shift jour 08:00–17:00 — glissez une commande'
                : 'Shift nuit 17:00–08:00 — glissez une commande'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
