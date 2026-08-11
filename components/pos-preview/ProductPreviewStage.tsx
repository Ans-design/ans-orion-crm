'use client';

import { normalizePreviewSize } from '@/lib/pos-preview/ratio-utils';
import type { ProductPreviewRegistryEntry } from '@/lib/pos-preview/product-preview.types';
import { resolveOrientationMode } from '@/lib/pos-preview/orientation-utils';
import { resolveSilhouette } from '@/lib/data/article-silhouette';

type Props = {
  product: { id: string; name: string; category: string };
  entry: ProductPreviewRegistryEntry;
  config?: Record<string, unknown>;
  compact?: boolean;
  children: (size: {
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape' | 'square';
    widthMm: number;
    heightMm: number;
  }) => React.ReactNode;
};

const MAX = { compact: { w: 140, h: 130 }, configurator: { w: 280, h: 240 } } as const;

/** Conteneur proportionnel — ratio réel depuis dimensions produit */
export function ProductPreviewStage({
  product,
  entry,
  config,
  compact = false,
  children,
}: Props) {
  const spec = resolveSilhouette(product, config);
  let widthMm = spec.widthMm;
  let heightMm = spec.heightMm;

  const orientation = resolveOrientationMode(entry.orientationMode, widthMm, heightMm);
  if (orientation === 'landscape' && widthMm < heightMm) {
    [widthMm, heightMm] = [heightMm, widthMm];
  }

  const limits = compact ? MAX.compact : MAX.configurator;
  const { width, height } = normalizePreviewSize(widthMm, heightMm, limits.w, limits.h);

  const objectFill = entry.dimensionMode === 'object';
  const displayW = objectFill ? Math.min(limits.w * 0.55, width * 1.4) : width;
  const displayH = objectFill ? Math.min(limits.h * 0.62, height * 1.4) : height;

  return (
    <>
      {children({
        width: Math.round(displayW),
        height: Math.round(displayH),
        orientation,
        widthMm,
        heightMm,
      })}
    </>
  );
}
