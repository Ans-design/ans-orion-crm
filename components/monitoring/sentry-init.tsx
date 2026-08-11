'use client';

import { useEffect } from 'react';
import { initSentryClient } from '@/lib/monitoring/sentry-client';

/** Initialise Sentry côté navigateur si NEXT_PUBLIC_SENTRY_DSN est défini. */
export function SentryInit() {
  useEffect(() => {
    initSentryClient();
  }, []);
  return null;
}
