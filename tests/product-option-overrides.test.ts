import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { applyProductOptionOverrides } from '@/lib/pos/apply-product-option-overrides';
import type { ProductOptionOverrides } from '@/lib/pos/product-option-overrides.types';

describe('applyProductOptionOverrides', () => {
  it('masque un champ quand visiblePos=false', () => {
    const cfg = getProductConfig('pkg-hangtag');
    expect(cfg).toBeTruthy();
    const fieldKey = cfg!.sections.flatMap((s) => s.fields)[0]?.key;
    expect(fieldKey).toBeTruthy();

    const overrides: ProductOptionOverrides = {
      articleId: 'pkg-hangtag',
      fields: {
        [fieldKey!]: {
          fieldKey: fieldKey!,
          groupId: 'g1',
          active: true,
          visiblePos: false,
          impactsPrice: true,
          impactsStock: false,
          impactsProduction: false,
          isInformational: false,
          metadata: null,
          inactiveValueLabels: [],
        },
      },
    };

    const next = applyProductOptionOverrides(cfg, overrides);
    const keys = next!.sections.flatMap((s) => s.fields.map((f) => f.key));
    expect(keys).not.toContain(fieldKey);
  });

  it('retire une option chip inactive', () => {
    const cfg = getProductConfig('pkg-hangtag');
    expect(cfg).toBeTruthy();
    const field = cfg!.sections.flatMap((s) => s.fields).find((f) => f.options && f.options.length > 1);
    expect(field?.options?.length).toBeGreaterThan(1);
    const removed = field!.options![0];

    const overrides: ProductOptionOverrides = {
      articleId: 'pkg-hangtag',
      fields: {
        [field!.key]: {
          fieldKey: field!.key,
          groupId: 'g1',
          active: true,
          visiblePos: true,
          impactsPrice: false,
          impactsStock: false,
          impactsProduction: false,
          isInformational: true,
          metadata: null,
          inactiveValueLabels: [removed],
        },
      },
    };

    const next = applyProductOptionOverrides(cfg, overrides);
    const nextField = next!.sections.flatMap((s) => s.fields).find((f) => f.key === field!.key);
    expect(nextField?.options).not.toContain(removed);
  });
});
