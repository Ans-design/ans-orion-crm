import type { ResponsiveMode } from '@/lib/responsive/breakpoints';

export type OverlayTask = 'choice' | 'form' | 'detail' | 'destructive' | 'finance';

export type OverlayPresentation =
  | 'dialog'
  | 'sheet-right'
  | 'sheet-bottom'
  | 'fullscreen'
  | 'alert';

/**
 * Contrat AdaptiveOverlay — pure, testable, sans permission métier.
 */
export function resolveOverlayPresentation(
  mode: ResponsiveMode,
  task: OverlayTask,
): OverlayPresentation {
  if (task === 'destructive' || task === 'finance') return 'alert';
  if (mode === 'desktop') {
    if (task === 'detail') return 'sheet-right';
    return 'dialog';
  }
  if (mode === 'tablet') {
    if (task === 'choice') return 'dialog';
    return 'sheet-right';
  }
  // phone
  if (task === 'choice') return 'sheet-bottom';
  if (task === 'form' || task === 'detail') return 'fullscreen';
  return 'sheet-bottom';
}
