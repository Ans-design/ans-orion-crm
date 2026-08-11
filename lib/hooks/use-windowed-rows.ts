'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

const WINDOW_THRESHOLD = 60;
const DEFAULT_ROW_HEIGHT = 44;
const DEFAULT_OVERSCAN = 8;

export type WindowedSlice<T> = {
  windowRows: T[];
  startIndex: number;
  topSpacerPx: number;
  bottomSpacerPx: number;
  virtualized: boolean;
};

/** Calcul pur de fenêtre — testable sans DOM (VF-QA01). */
export function computeWindowedSlice<T>(
  rows: T[],
  opts: {
    scrollTop: number;
    clientHeight: number;
    rowHeight?: number;
    threshold?: number;
    overscan?: number;
  },
): WindowedSlice<T> {
  const rowHeight = opts.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const threshold = opts.threshold ?? WINDOW_THRESHOLD;
  const overscan = opts.overscan ?? DEFAULT_OVERSCAN;

  if (rows.length < threshold) {
    return {
      windowRows: rows,
      startIndex: 0,
      topSpacerPx: 0,
      bottomSpacerPx: 0,
      virtualized: false,
    };
  }

  const start = Math.max(0, Math.floor(opts.scrollTop / rowHeight) - overscan);
  const visible = Math.ceil(opts.clientHeight / rowHeight) + overscan * 2;
  const end = Math.min(rows.length, start + visible);

  return {
    windowRows: rows.slice(start, end),
    startIndex: start,
    topSpacerPx: start * rowHeight,
    bottomSpacerPx: Math.max(0, (rows.length - end) * rowHeight),
    virtualized: true,
  };
}

/** Fenêtre de lignes selon scroll — sans dépendance externe (Lot 6). */
export function useWindowedRows<T>(
  rows: T[],
  containerRef: RefObject<HTMLElement | null>,
  rowHeight = DEFAULT_ROW_HEIGHT,
  threshold = WINDOW_THRESHOLD,
): WindowedSlice<T> {
  const [range, setRange] = useState({ start: 0, end: Math.min(rows.length, 40) });
  // Ref pour lire les lignes courantes dans les listeners sans relancer l'effet à chaque identité
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || rows.length < threshold) {
      setRange({ start: 0, end: rows.length });
      return;
    }

    const update = () => {
      const slice = computeWindowedSlice(rowsRef.current, {
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight,
        rowHeight,
        threshold,
      });
      setRange({
        start: slice.startIndex,
        end: slice.startIndex + slice.windowRows.length,
      });
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [rows.length, rowHeight, threshold, containerRef]);

  if (rows.length < threshold) {
    return {
      windowRows: rows,
      startIndex: 0,
      topSpacerPx: 0,
      bottomSpacerPx: 0,
      virtualized: false,
    };
  }

  return {
    windowRows: rows.slice(range.start, range.end),
    startIndex: range.start,
    topSpacerPx: range.start * rowHeight,
    bottomSpacerPx: Math.max(0, (rows.length - range.end) * rowHeight),
    virtualized: true,
  };
}
