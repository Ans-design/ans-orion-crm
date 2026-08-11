'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ORION_LIVE_CHANNEL,
  ORION_LIVE_EVENT,
  domainsMatch,
  type OrionLiveDetail,
  type OrionLiveDomain,
} from '@/lib/live/orion-live';

type Options = {
  debounceMs?: number;
  onFocus?: boolean;
  focusMinMs?: number;
  /** Polling multi-postes (ms). 0 = désactivé. Défaut 10s. */
  pollMs?: number;
};

/**
 * Compteur de révision live — CustomEvent + BroadcastChannel + focus + poll serveur.
 */
export function useOrionLiveRevision(
  domains: OrionLiveDomain[],
  opts?: Options,
): number {
  const [tick, setTick] = useState(0);
  const debounceMs = opts?.debounceMs ?? 350;
  const onFocus = opts?.onFocus !== false;
  const focusMinMs = opts?.focusMinMs ?? 25_000;
  const pollMs = opts?.pollMs ?? 10_000;
  const lastFocusBump = useRef(0);
  const timer = useRef<number | null>(null);
  const lastMax = useRef(0);
  const domainsKey = domains.slice().sort().join('|');

  const bump = useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setTick((t) => t + 1);
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    const list = domainsKey.split('|').filter(Boolean) as OrionLiveDomain[];
    if (!list.length) return;

    const onEvent = (ev: Event) => {
      const detail = (ev as CustomEvent<OrionLiveDetail>).detail;
      if (!detail?.domain) return;
      if (domainsMatch(list, detail.domain)) bump();
    };

    window.addEventListener(ORION_LIVE_EVENT, onEvent);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(ORION_LIVE_CHANNEL);
      bc.onmessage = (msg) => {
        const detail = msg.data as OrionLiveDetail | undefined;
        if (detail?.domain && domainsMatch(list, detail.domain)) bump();
      };
    } catch {
      /* ignore */
    }

    const onVis = () => {
      if (!onFocus || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFocusBump.current < focusMinMs) return;
      lastFocusBump.current = now;
      bump();
    };
    document.addEventListener('visibilitychange', onVis);

    let pollTimer: number | null = null;
    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const qs = encodeURIComponent(list.join(','));
        const r = await fetch(`/api/live/revision?domains=${qs}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!r.ok) return;
        const body = await r.json();
        const data = (body?.ok && body.data) ? body.data : body;
        const max = Number(data?.max ?? 0);
        if (!Number.isFinite(max) || max <= 0) return;
        if (lastMax.current === 0) {
          lastMax.current = max;
          return;
        }
        if (max > lastMax.current) {
          lastMax.current = max;
          bump();
        }
      } catch {
        /* ignore network */
      }
    };

    if (pollMs > 0) {
      void poll();
      pollTimer = window.setInterval(() => {
        void poll();
      }, pollMs);
    }

    return () => {
      window.removeEventListener(ORION_LIVE_EVENT, onEvent);
      document.removeEventListener('visibilitychange', onVis);
      bc?.close();
      if (timer.current != null) window.clearTimeout(timer.current);
      if (pollTimer != null) window.clearInterval(pollTimer);
    };
  }, [domainsKey, bump, onFocus, focusMinMs, pollMs]);

  return tick;
}
