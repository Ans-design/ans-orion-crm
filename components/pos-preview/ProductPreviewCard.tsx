'use client';

import type { CatalogueItem } from '@/lib/data/catalogue';
import { ENABLE_PRODUCT_PREVIEWS } from '@/lib/pos/features';
import { ProductPreviewEngine } from '@/components/pos-preview/ProductPreviewEngine';

type Props = {
  item: Pick<CatalogueItem, 'id' | 'name' | 'category' | 'icon'>;
  config?: Record<string, unknown>;
  compact?: boolean;
};

/** Carte compacte pour grille catalogue — désactivée si previews off */
export function ProductPreviewCard({ item, config, compact = true }: Props) {
  if (!ENABLE_PRODUCT_PREVIEWS) return null;

  return (    <ProductPreviewEngine
      product={item}
      selectedOptions={config}
      compact={compact}
      showDimensions={!compact}
      mode="compact"
      className="rounded-[7px] overflow-hidden border border-border/50 bg-card/50"
    />
  );
}
