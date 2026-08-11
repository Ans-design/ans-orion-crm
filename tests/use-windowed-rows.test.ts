import { describe, expect, it } from 'vitest';

const THRESHOLD = 60;
const ROW_H = 44;
const OVERSCAN = 8;

function computeWindow(
  rowsLength: number,
  scrollTop: number,
  clientHeight: number,
  threshold = THRESHOLD,
) {
  if (rowsLength < threshold) {
    return { start: 0, end: rowsLength, virtualized: false };
  }
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const visible = Math.ceil(clientHeight / ROW_H) + OVERSCAN * 2;
  const end = Math.min(rowsLength, start + visible);
  return { start, end, virtualized: true };
}

describe('useWindowedRows logic', () => {
  it('pas de virtualisation sous le seuil', () => {
    const w = computeWindow(30, 0, 400);
    expect(w.virtualized).toBe(false);
    expect(w.end).toBe(30);
  });

  it('fenêtre scroll au-delà de 60 lignes', () => {
    const w = computeWindow(120, 880, 400);
    expect(w.virtualized).toBe(true);
    expect(w.start).toBeGreaterThan(0);
    expect(w.end).toBeLessThanOrEqual(120);
    expect(w.end - w.start).toBeLessThan(40);
  });
});
