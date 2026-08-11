'use client';

import { useCallback, useEffect, useState } from 'react';
import { EMPTY_NAV_BADGES, type NavBadgeCounts } from '@/lib/navigation/nav-badges-shared';
import { unwrapApiData } from '@/lib/api-client';

const REFRESH_MS = 240_000;
/** Évite rafale /api/nav/badges à chaque alt-tab. */
const VISIBILITY_MIN_MS = 90_000;

/** Émis par ANS Talk (FAB / messagerie) pour aligner le badge sidebar immédiatement */
export const ORION_TALK_UNREAD_EVENT = 'orion:talk-unread';
export const ORION_NAV_BADGES_REFRESH_EVENT = 'orion:nav-badges-refresh';

type Listener = (badges: NavBadgeCounts) => void;

let sharedBadges: NavBadgeCounts = EMPTY_NAV_BADGES;
const listeners = new Set<Listener>();
let pollBooted = false;
let bootTimer: number | null = null;
let intervalTimer: number | null = null;
let inFlight = false;
let subscriberCount = 0;
let lastRefreshAt = 0;

function publish(next: NavBadgeCounts) {
  sharedBadges = next;
  for (const l of listeners) l(next);
}

async function refreshShared(force = false): Promise<void> {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  if (inFlight) return;
  const now = Date.now();
  if (!force && lastRefreshAt > 0 && now - lastRefreshAt < 8_000) return;
  inFlight = true;
  try {
    const r = await fetch('/api/nav/badges', { credentials: 'include', cache: 'no-store' });
    if (r.status === 401) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useNavBadges] 401 ignoré — session conservée');
      }
      return;
    }
    if (!r.ok) return;
    const body = await r.json();
    const data = unwrapApiData<{ badges?: NavBadgeCounts }>(body);
    const next = data?.badges ?? (body as { badges?: NavBadgeCounts })?.badges;
    if (next) {
      lastRefreshAt = Date.now();
      publish(next);
    }
  } catch {
    /* ignore */
  } finally {
    inFlight = false;
  }
}

function onVisibility() {
  if (document.visibilityState !== 'visible') return;
  if (lastRefreshAt > 0 && Date.now() - lastRefreshAt < VISIBILITY_MIN_MS) return;
  void refreshShared();
}

function onTalkUnread(ev: Event) {
  const count = (ev as CustomEvent<{ count?: number }>).detail?.count;
  if (typeof count === 'number' && Number.isFinite(count)) {
    publish(
      sharedBadges.ansTalk === count
        ? sharedBadges
        : { ...sharedBadges, ansTalk: count },
    );
    return;
  }
  void refreshShared(true);
}

function onForceRefresh() {
  void refreshShared(true);
}

function ensureSharedPoll() {
  if (pollBooted || typeof window === 'undefined') return;
  pollBooted = true;
  bootTimer = window.setTimeout(() => {
    void refreshShared();
  }, 2800);
  intervalTimer = window.setInterval(() => {
    void refreshShared();
  }, REFRESH_MS);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener(ORION_TALK_UNREAD_EVENT, onTalkUnread);
  window.addEventListener(ORION_NAV_BADGES_REFRESH_EVENT, onForceRefresh);
}

function teardownSharedPollIfIdle() {
  if (subscriberCount > 0 || typeof window === 'undefined') return;
  if (bootTimer != null) clearTimeout(bootTimer);
  if (intervalTimer != null) clearInterval(intervalTimer);
  bootTimer = null;
  intervalTimer = null;
  pollBooted = false;
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener(ORION_TALK_UNREAD_EVENT, onTalkUnread);
  window.removeEventListener(ORION_NAV_BADGES_REFRESH_EVENT, onForceRefresh);
}

/** Badges nav partagés — un seul poll même si sidebar + bottom nav montés. */
export function useNavBadges(enabled = true) {
  const [badges, setBadges] = useState<NavBadgeCounts>(sharedBadges);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    await refreshShared(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    subscriberCount += 1;
    listeners.add(setBadges);
    setBadges(sharedBadges);
    ensureSharedPoll();
    return () => {
      listeners.delete(setBadges);
      subscriberCount = Math.max(0, subscriberCount - 1);
      teardownSharedPollIfIdle();
    };
  }, [enabled]);

  return { badges, refreshBadges: refresh };
}
