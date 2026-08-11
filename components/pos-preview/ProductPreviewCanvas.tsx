'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import type { ProductPreviewRegistryEntry } from '@/lib/pos-preview/preview-types';
import { ProductPreviewFallback } from '@/components/pos-preview/ProductPreviewFallback';

const ProductPreview3DLazy = dynamic(
  () => import('@/components/pos-preview/ProductPreview3D').then((m) => m.ProductPreview3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse rounded-[7px] bg-muted/30 border border-border/40" />
    ),
  },
);

type Props = {
  entry: ProductPreviewRegistryEntry;
  width: number;
  height: number;
  color?: string;
  enabled: boolean;
  fallback: React.ReactNode;
};

/** Tier 3D progressif — lazy, uniquement mode advanced */
export function ProductPreviewCanvas({
  entry,
  width,
  height,
  enabled,
  fallback,
}: Props) {
  if (!enabled || entry.previewMode !== 'interactive-3d') {
    return <>{fallback}</>;
  }

  return (
    <Suspense
      fallback={
        <ProductPreviewFallback icon={entry.fallbackIcon} label="Chargement 3D…" />
      }
    >
      <ProductPreview3DLazy
        entry={entry}
        width={width}
        height={height}
        fallback={fallback}
      />
    </Suspense>
  );
}
