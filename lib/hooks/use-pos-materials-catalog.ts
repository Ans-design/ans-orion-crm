'use client';

import { useEffect, useState } from 'react';
import { unwrapApiData } from '@/lib/api-client';

type MaterialsCatalog = {
  weightsByType?: Record<string, string[]>;
  printLabels?: string[];
};

export function usePosMaterialsCatalog() {
  const [materialWeights, setMaterialWeights] = useState<Record<string, string[]>>({});
  const [printMaterialOptions, setPrintMaterialOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/materials-catalog', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        const data = unwrapApiData<MaterialsCatalog>(body);
        if (data.weightsByType) setMaterialWeights(data.weightsByType);
        if (Array.isArray(data.printLabels)) setPrintMaterialOptions(data.printLabels);
      })
      .catch(() => {
        if (!cancelled) {
          setMaterialWeights({});
          setPrintMaterialOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { materialWeights, printMaterialOptions };
}
