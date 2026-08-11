import type { OrientationMode } from '@/lib/pos-preview/product-preview.types';

export type SmartOrientation = 'portrait' | 'landscape' | 'square';

export function getSmartOrientation(widthMm: number, heightMm: number): SmartOrientation {
  if (widthMm <= 0 || heightMm <= 0) return 'portrait';
  const ratio = widthMm / heightMm;
  if (ratio > 1.08) return 'landscape';
  if (ratio < 0.92) return 'portrait';
  return 'square';
}

export function resolveOrientationMode(
  mode: OrientationMode,
  widthMm: number,
  heightMm: number,
): SmartOrientation {
  if (mode === 'portrait') return 'portrait';
  if (mode === 'landscape') return 'landscape';
  if (mode === 'square') return 'square';
  return getSmartOrientation(widthMm, heightMm);
}

export function canUseLandscapeAsset(orientation: SmartOrientation): boolean {
  return orientation === 'landscape' || orientation === 'square';
}

export function canUsePortraitAsset(orientation: SmartOrientation): boolean {
  return orientation === 'portrait' || orientation === 'square';
}
