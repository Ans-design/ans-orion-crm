'use client';

import { useEffect, useState } from 'react';
import type { ChipAdminEntry } from '@/lib/admin-config/types';
import { unwrapApiData } from '@/lib/api-client';

export function usePosAdminChips(articleId: string | undefined) {
  const [adminChips, setAdminChips] = useState<Record<string, ChipAdminEntry>>({});

  useEffect(() => {
    if (!articleId) {
      setAdminChips({});
      return;
    }

    let cancelled = false;

    fetch(`/api/admin-config/product/${articleId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        const data = unwrapApiData<{ chips?: Record<string, ChipAdminEntry> }>(body);
        if (data.chips) setAdminChips(data.chips);
      })
      .catch(() => {
        if (!cancelled) setAdminChips({});
      });

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  return adminChips;
}
