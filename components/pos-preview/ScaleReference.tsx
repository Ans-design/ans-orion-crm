'use client';

import type { CSSProperties } from 'react';
import type { PreviewOrientation } from '@/lib/pos-preview/preview-types';
import { HUMAN_HEIGHT_MM } from '@/lib/pos-preview/ratio-utils';

type Props = {
  productHeightMm: number;
  orientation: PreviewOrientation;
  className?: string;
};

/** Silhouette humaine ~1,75 m pour comparer les grands formats */
export function ScaleReference({ productHeightMm, orientation, className = '' }: Props) {
  const humanPx = 72;
  const productPx = Math.min(120, Math.max(40, (productHeightMm / HUMAN_HEIGHT_MM) * humanPx * 1.2));
  const isVertical = orientation !== 'landscape';

  return (
    <div
      className={`flex items-end gap-2 text-[9px] text-muted-foreground ${className}`}
      aria-label="Échelle approximative"
    >
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="w-5 rounded-t-full bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10 border border-border/50"
          style={{ height: humanPx }}
          title="Silhouette 1,75 m"
        />
        <span>1,75 m</span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="rounded-sm bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/40"
          style={
            isVertical
              ? { width: 28, height: productPx }
              : { width: productPx, height: 20 }
          }
        />
        <span>Produit</span>
      </div>
      <span className="italic opacity-70 self-end pb-1">Échelle approx.</span>
    </div>
  );
}

export function getScaleReferenceStyle(): CSSProperties {
  return { pointerEvents: 'none' };
}
