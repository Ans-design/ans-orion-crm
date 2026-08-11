'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ResolvedProductPreview } from '@/lib/data/product-preview-resolver';

/** Cadre studio e-commerce — fond neutre, éclairage catalogue B2B */
export function EcommerceStudioFrame({
  children,
  width = 320,
  height = 240,
  compact = false,
  categoryLabel,
  topOverlay,
}: {
  children: React.ReactNode;
  width?: number;
  height?: number;
  compact?: boolean;
  categoryLabel?: string;
  topOverlay?: React.ReactNode;
}) {
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-[7px] border border-border/50"
      style={{
        width: '100%',
        maxWidth: width,
        minHeight: compact ? height * 0.85 : height,
        background: 'linear-gradient(165deg, #fafbfc 0%, #f0f2f5 45%, #e8ebef 100%)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 35%, rgba(255,255,255,0.95) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[55%] h-[6%] rounded-[50%] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.12) 0%, transparent 70%)' }}
      />
      {(categoryLabel || topOverlay) && (
        <div className="absolute top-2 left-2 right-2 z-20 flex items-start justify-between gap-2 pointer-events-none">
          {categoryLabel ? (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 text-muted-foreground border border-border/40 backdrop-blur-sm">
              {categoryLabel}
            </span>
          ) : (
            <span />
          )}
          {topOverlay ? (
            <div className="flex flex-wrap items-center gap-1 justify-end pointer-events-auto">
              {topOverlay}
            </div>
          ) : null}
        </div>
      )}
      <div className={`relative z-10 flex items-center justify-center w-full h-full ${compact ? 'py-3 px-2' : 'py-6 px-4'}`}>
        {children}
      </div>
    </div>
  );
}

type StudioImagePreviewProps = {
  preview: ResolvedProductPreview;
  width: number;
  height: number;
  fallback: React.ReactNode;
};

/** Image catalogue avec fallback SVG si asset absent */
export function StudioImagePreview({ preview, width, height, fallback }: StudioImagePreviewProps) {
  const [failed, setFailed] = useState(false);
  const src = preview.assetPath;

  if (!src || failed || preview.source === 'svg') {
    return <>{fallback}</>;
  }

  return (
    <Image
      src={src}
      alt={preview.previewLabel}
      width={width}
      height={height}
      className="object-contain drop-shadow-md"
      style={{ maxHeight: height, width: 'auto' }}
      onError={() => setFailed(true)}
      priority={false}
      unoptimized={src.endsWith('.svg')}
    />
  );
}

/** Badges discrets sur l’aperçu */
export function PreviewVariantBadges({
  rectoVerso,
  roundedCorners,
}: {
  rectoVerso?: boolean;
  roundedCorners?: boolean;
}) {
  if (!rectoVerso && !roundedCorners) return null;
  return (
    <div className="absolute bottom-2 right-2 z-20 flex flex-col gap-1 items-end">
      {rectoVerso && (
        <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#FF174D]/15 text-[#FF174D] border border-[#FF174D]/25">
          Recto-verso
        </span>
      )}
      {roundedCorners && (
        <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
          Coins arrondis
        </span>
      )}
    </div>
  );
}
