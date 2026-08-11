import type { PreviewOrientation } from '@/lib/pos-preview/preview-types';

export type DimUnit = 'mm' | 'cm' | 'm';

export function toMillimeters(value: number, unit: DimUnit): number {
  if (unit === 'cm') return value * 10;
  if (unit === 'm') return value * 1000;
  return value;
}

export function getOrientation(widthMm: number, heightMm: number): PreviewOrientation {
  const ratio = widthMm / heightMm;
  if (ratio > 1.08) return 'landscape';
  if (ratio < 0.92) return 'portrait';
  return 'square';
}

export function getProductRatio(width: number, height: number, unit: DimUnit = 'mm'): number {
  const w = toMillimeters(width, unit);
  const h = toMillimeters(height, unit);
  if (h <= 0) return 1;
  return w / h;
}

export function normalizePreviewSize(
  widthMm: number,
  heightMm: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  let w = widthMm;
  let h = heightMm;
  if (w <= 0 || h <= 0) return { width: maxWidth * 0.6, height: maxHeight * 0.75 };

  const ratio = w / h;
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export function getScaleLabel(widthMm: number, heightMm: number, unit: DimUnit = 'mm'): string {
  const w = toMillimeters(widthMm, unit === 'mm' ? 'mm' : unit);
  const h = toMillimeters(heightMm, unit === 'mm' ? 'mm' : unit);
  if (w >= 1000 || h >= 1000) {
    return `${(w / 10).toFixed(0)} × ${(h / 10).toFixed(0)} cm`;
  }
  return `${Math.round(w)} × ${Math.round(h)} mm`;
}

export function getSurfaceM2(widthMm: number, heightMm: number): number {
  return (widthMm / 1000) * (heightMm / 1000);
}

export type RulerTick = { position: number; label: string };

export function getRulerTicks(lengthMm: number, maxTicks = 5): RulerTick[] {
  if (lengthMm <= 0) return [];
  const step = lengthMm / (maxTicks - 1);
  const ticks: RulerTick[] = [];
  for (let i = 0; i < maxTicks; i++) {
    const mm = step * i;
    const label = mm >= 1000 ? `${(mm / 10).toFixed(0)}cm` : `${Math.round(mm)}mm`;
    ticks.push({ position: i / (maxTicks - 1), label });
  }
  return ticks;
}

/** Référence d'échelle humaine (175 cm) pour grand format */
export const HUMAN_HEIGHT_MM = 1750;

export function shouldShowScaleReference(widthMm: number, heightMm: number): boolean {
  return Math.max(widthMm, heightMm) >= 800;
}
