'use client';

import type { ConfigField } from '@/lib/data/config-types';
import { inferFieldPriceImpactDefaults } from '@/lib/pricing/config-to-dynamic-pricing';
import { resolveFieldPriceImpact } from '@/lib/pricing/price-impact-rules';
import type { FieldOptionOverride } from '@/lib/pos/product-option-overrides.types';

type Props = {
  articleId: string;
  field: Pick<ConfigField, 'key' | 'type' | 'customInput' | 'forcePriceValues'>;
  override?: FieldOptionOverride;
};

export function PosFieldPriceImpactBadge({ articleId, field, override }: Props) {
  const defaults = inferFieldPriceImpactDefaults({
    key: field.key,
    type: field.type,
    customInput: field.customInput,
    forcePriceValues: field.forcePriceValues,
  });

  if (override) {
    if (override.impactsPrice) {
      return (
        <span className="pos-impact-badge shrink-0">
          Impact prix
        </span>
      );
    }
    if (override.isInformational) {
      return (
        <span className="pos-impact-badge pos-impact-badge--info shrink-0">
          Descriptif
        </span>
      );
    }
    return null;
  }

  const status = resolveFieldPriceImpact({
    articleId,
    fieldKey: field.key,
    defaultImpactsPrice: defaults.impactsPrice,
    defaultIsInformational: defaults.isInformational,
  });

  if (status.impactsPrice) {
    return (
      <span className="pos-impact-badge shrink-0">
        Impact prix
      </span>
    );
  }
  if (status.isInformational) {
    return (
      <span className="pos-impact-badge pos-impact-badge--info shrink-0">
        Descriptif
      </span>
    );
  }
  return null;
}
