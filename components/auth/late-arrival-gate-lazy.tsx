'use client';

/**
 * Charge LateArrivalGate après le premier paint — évite framer-motion + RH API
 * dans le bundle critique du shell (local / navigation plus fluide).
 */

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';

export function LateArrivalGateLazy({ children }: { children: ReactNode }) {
  const [Gate, setGate] = useState<ComponentType<{ children: ReactNode }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      void import('@/components/auth/late-arrival-gate').then((m) => {
        if (!cancelled) setGate(() => m.LateArrivalGate);
      });
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(enable, { timeout: 4_000 });
    } else {
      timeoutId = setTimeout(enable, 2_000);
    }
    return () => {
      cancelled = true;
      if (idleId != null && typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!Gate) return <>{children}</>;
  return <Gate>{children}</Gate>;
}
