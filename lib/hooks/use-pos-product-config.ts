'use client';

import { useEffect, useState } from 'react';
import { loadProductConfig, type ProductConfig } from '@/lib/data/config-types-loader';

export function usePosProductConfig(articleId: string, configType: string | undefined) {
  const [productConfig, setProductConfig] = useState<ProductConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void loadProductConfig(articleId, configType)
      .then((cfg) => {
        if (!cancelled) {
          setProductConfig(cfg);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProductConfig(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [articleId, configType]);

  return { productConfig, setProductConfig, configSchemaLoading: loading };
}
