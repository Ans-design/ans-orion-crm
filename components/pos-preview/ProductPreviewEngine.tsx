'use client';

import { useMemo, useState } from 'react';
import { ENABLE_PRODUCT_PREVIEWS } from '@/lib/pos/features';
import { Layers, Box } from 'lucide-react';
import type { CatalogueItem } from '@/lib/data/catalogue';
import type { ProductPreviewAdminEntry } from '@/lib/admin-config/types';
import { EcommerceStudioFrame } from '@/components/pos/studio-product-preview';
import { DimensionRuler } from '@/components/pos-preview/DimensionRuler';
import { FinishBadge } from '@/components/pos-preview/FinishBadge';
import { MaterialBadge } from '@/components/pos-preview/MaterialBadge';
import { ProductPreview3D } from '@/components/pos-preview/ProductPreview3D';
import { ProductPreviewStage } from '@/components/pos-preview/ProductPreviewStage';
import { ScaleReference } from '@/components/pos-preview/ScaleReference';
import { renderFamilyFallback } from '@/components/pos-preview/fallbacks';
import { FinishLayer, MaterialLayer } from '@/components/pos-preview/MaterialLayer';
import {
  getPreviewPerspectiveClass,
  resolvePreviewContext,
} from '@/lib/pos-preview/product-preview-mapper';
import type { PreviewMode } from '@/lib/pos-preview/preview-types';
import { resolveSilhouette } from '@/lib/data/article-silhouette';
import type { PreviewAdminOverride } from '@/lib/data/product-preview-resolver';

export type ProductPreviewEngineProps = {
  product: Pick<CatalogueItem, 'id' | 'name' | 'category' | 'icon'>;
  selectedOptions?: Record<string, unknown>;
  quantity?: number;
  uploadedDesign?: string | null;
  mode?: PreviewMode;
  compact?: boolean;
  showDimensions?: boolean;
  className?: string;
  previewOverride?: PreviewAdminOverride | ProductPreviewAdminEntry | null;
};

/**
 * Moteur central d'aperçu produit POS — fallbacks par famille, sans anciennes silhouettes legacy.
 */
export function ProductPreviewEngine(props: ProductPreviewEngineProps) {
  if (!ENABLE_PRODUCT_PREVIEWS) {
    return null;
  }

  return <ProductPreviewEngineInner {...props} />;
}

function ProductPreviewEngineInner({
  product,
  selectedOptions,
  quantity,
  uploadedDesign,
  mode: modeProp,
  compact = false,
  showDimensions = true,
  className = '',
}: ProductPreviewEngineProps) {
  const [view3D, setView3D] = useState(false);
  const mode: PreviewMode = modeProp ?? (compact ? 'compact' : 'configurator');

  const ctx = useMemo(
    () =>
      resolvePreviewContext({
        product,
        selectedOptions,
        quantity,
        uploadedDesign,
        mode,
      }),
    [product, selectedOptions, quantity, uploadedDesign, mode],
  );

  const spec = useMemo(
    () => resolveSilhouette(product, selectedOptions),
    [product, selectedOptions],
  );

  const canToggle3D = ctx.entry.previewMode === 'interactive-3d' && !compact;
  const perspectiveClass = getPreviewPerspectiveClass(ctx.entry.previewMode);

  const topOverlay = (
    <>
      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 text-muted-foreground border border-border/40 backdrop-blur-sm">
        {ctx.familyLabel}
      </span>
      {!compact && (
        <>
          <MaterialBadge material={ctx.materialVisual} />
          <FinishBadge finish={ctx.finishVisual} />
          {canToggle3D && (
            <button
              type="button"
              onClick={() => setView3D((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium bg-white/90 border border-border/60 hover:border-[var(--brand-primary)]/50 transition-colors shadow-sm"
              title={view3D ? 'Vue 2D' : 'Aperçu pseudo-3D'}
            >
              {view3D ? <Layers size={11} /> : <Box size={11} />}
              {view3D ? '2D' : '3D'}
            </button>
          )}
        </>
      )}
    </>
  );

  const frameW = compact ? 160 : 340;
  const frameH = compact ? 130 : 280;

  return (
    <div className={`pos-preview-engine ${className}`}>
      <div className="px-2 sm:px-3 py-3 flex justify-center">
        <EcommerceStudioFrame
          width={frameW}
          height={frameH}
          compact={compact}
          topOverlay={topOverlay}
        >
          <ProductPreviewStage
            product={product}
            entry={ctx.entry}
            config={selectedOptions}
            compact={compact}
          >
            {(size) => {
              const fallbackNode = renderFamilyFallback(ctx.entry.fallbackComponent, {
                width: size.width,
                height: size.height,
                orientation: size.orientation,
                productName: product.name,
                mockupKey: ctx.entry.mockupKey,
                materialLabel: ctx.materialVisual.label,
                finishLabel: ctx.finishVisual.label,
                uploadedDesign,
                indicative: ctx.indicative,
              });

              const previewBody =
                view3D && canToggle3D ? (
                  <div className={perspectiveClass}>
                    <ProductPreview3D
                      entry={ctx.entry}
                      width={size.width}
                      height={size.height}
                      fallback={fallbackNode}
                    />
                  </div>
                ) : (
                  <div className={`relative ${perspectiveClass}`}>
                    {fallbackNode}
                    <MaterialLayer gloss={ctx.materialVisual.gloss} />
                    <FinishLayer active={ctx.finishVisual.glossBoost > 0.1} />
                  </div>
                );

              return (
                <div className="flex flex-col items-center gap-1">
                  {previewBody}
                  <span className="text-[8px] text-muted-foreground/80 italic">Aperçu indicatif</span>
                </div>
              );
            }}
          </ProductPreviewStage>
        </EcommerceStudioFrame>
      </div>

      {ctx.entry.scaleReference && !compact && (
        <div className="px-4 pb-1">
          <ScaleReference
            productHeightMm={spec.heightMm}
            orientation={ctx.orientation}
            className="max-w-[340px] mx-auto"
          />
        </div>
      )}

      {showDimensions && (
        <div className="px-4 pb-3 pt-2 border-t border-border/40 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
            <span className="font-mono text-[#FF174D]">{ctx.scaleLabel}</span>
            <span className="text-muted-foreground capitalize">{ctx.orientation}</span>
            {quantity != null && quantity > 0 && (
              <span className="text-muted-foreground">× {quantity}</span>
            )}
          </div>

          {(ctx.entry.scaleReference || ctx.surfaceM2) && !compact && (
            <DimensionRuler
              widthMm={spec.widthMm}
              heightMm={spec.heightMm}
              orientation={ctx.orientation}
              surfaceM2={ctx.surfaceM2}
            />
          )}

          {ctx.missingFields.length > 0 && (
            <p className="text-[9px] text-amber-500/90">
              Aperçu partiel — renseigner : {ctx.missingFields.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
