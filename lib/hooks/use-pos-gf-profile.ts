'use client';

import { useEffect, useState } from 'react';
import type { GfApiProfile } from '@/lib/grand-format/pos-config';
import { unwrapApiData } from '@/lib/api-client';
import {
  DEFAULT_GF_ADMIN_PRICING,
  setGfAdminPricingRuntime,
} from '@/lib/grand-format/gf-admin-config';

export function usePosGfProfile(articleId: string | undefined, isGfArticle: boolean) {
  const [gfProfile, setGfProfile] = useState<GfApiProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isGfArticle || !articleId) {
      setGfProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/grand-format/${articleId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return;
        const profile = body ? unwrapApiData<GfApiProfile>(body) : null;
        setGfProfile(profile);
        if (profile?.adminPricing) {
          setGfAdminPricingRuntime({ ...DEFAULT_GF_ADMIN_PRICING, ...profile.adminPricing });
        }
      })
      .catch(() => {
        if (!cancelled) setGfProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [articleId, isGfArticle]);

  return { gfProfile, gfProfileLoading: loading };
}
