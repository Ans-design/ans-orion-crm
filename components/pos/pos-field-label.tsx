'use client';

import type { ReactNode } from 'react';
import type { ConfigField } from '@/lib/data/config-types';
import { PosFieldPriceImpactBadge } from '@/components/pos/pos-field-price-impact-badge';
import type { FieldOptionOverride } from '@/lib/pos/product-option-overrides.types';

type Props = {
  articleId: string;
  field: ConfigField;
  className?: string;
  hint?: ReactNode;
  override?: FieldOptionOverride | null;
};

export function PosFieldLabel({ articleId, field, className, hint, override }: Props) {
  if (!field.label) return null;
  const optional = field.required === false;

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className ?? ''}`}>
      <label className="orion-text-label pos-field-label">
        {field.label}
        {optional ? ' (optionnel)' : ''}
      </label>
      <PosFieldPriceImpactBadge
        articleId={articleId}
        field={field}
        override={override ?? undefined}
      />
      {hint}
    </div>
  );
}
