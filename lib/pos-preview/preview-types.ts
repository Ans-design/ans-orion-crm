import type { CSSProperties } from 'react';
import type {
  ProductPreviewInput,
  ProductPreviewRegistryEntry,
} from '@/lib/pos-preview/product-preview.types';

export type {
  ProductPreviewFamily,
  PreviewModeKind,
  FallbackComponentKey,
  DimensionMode,
  OrientationMode,
  ProductPreviewRegistryEntry,
  PreviewDisplayMode,
  FallbackRenderProps,
} from '@/lib/pos-preview/product-preview.types';

/** Alias compat — modes d'affichage POS */
export type PreviewMode = 'compact' | 'configurator' | 'advanced';
export type PreviewOrientation = 'portrait' | 'landscape' | 'square';

export type MaterialVisualStyle = {
  id: string;
  label: string;
  gloss: number;
  opacity: number;
  textureClass: string;
  shadowIntensity: number;
};

export type FinishVisualStyle = {
  id: string;
  label: string;
  glossBoost: number;
  overlayClass?: string;
};

export type ResolvedPreviewContext = {
  entry: ProductPreviewRegistryEntry;
  orientation: PreviewOrientation;
  ratio: number;
  displayWidth: number;
  displayHeight: number;
  scaleLabel: string;
  surfaceM2?: number;
  materialVisual: MaterialVisualStyle;
  finishVisual: FinishVisualStyle;
  missingFields: string[];
  useAdvanced3D: boolean;
  familyLabel: string;
  indicative: boolean;
};

export type { ProductPreviewInput };

export function getPreviewPerspectiveClass(previewMode: string): string {
  if (previewMode === 'interactive-3d' || previewMode === 'pseudo-3d') {
    return 'pos-preview-perspective';
  }
  return 'pos-preview-flat';
}

export function getPreviewShadowStyle(intensity: number): CSSProperties {
  return {
    filter: `drop-shadow(0 ${6 + intensity * 12}px ${14 + intensity * 20}px rgba(0,0,0,${0.18 + intensity * 0.2}))`,
  };
}
