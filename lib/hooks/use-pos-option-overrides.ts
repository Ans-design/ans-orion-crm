'use client';

import { useEffect, useState } from 'react';
import type { ProductOptionOverrides } from '@/lib/pos/product-option-overrides.types';
import { unwrapApiData } from '@/lib/api-client';

export function usePosOptionOverrides(articleId: string | undefined) {
  const [optionOverrides, setOptionOverrides] = useState<ProductOptionOverrides | null>(null);

  useEffect(() => {
    if (!articleId) {
      setOptionOverrides(null);
      return;
    }

    let cancelled = false;

    fetch(`/api/pos/article/${encodeURIComponent(articleId)}/option-overrides`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        const data = unwrapApiData<{ overrides?: ProductOptionOverrides }>(body);
        if (data.overrides) setOptionOverrides(data.overrides);
      })
      .catch(() => {
        if (!cancelled) setOptionOverrides(null);
      });

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  return optionOverrides;
}
