'use client';

import { useEffect } from 'react';

const STATIC_RELOAD_KEY = 'orion-static-reload';
const CHUNK_RELOAD_KEY = 'orion-chunk-reload';

/**
 * En développement : désactive les SW résiduels et recharge une fois si un asset
 * /_next/static est en 404 (HTML brut / CSS absent après cache ou .next supprimé).
 */
export function DevBootRecovery() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
    }

    const assetsLookLoaded = () => {
      const css =
        document.querySelector('link[data-nextjs-css]') ??
        document.querySelector('link[href*="/_next/static/css"]');
      const script = document.querySelector('script[src*="/_next/static/chunks"]');
      return Boolean(css || script);
    };

    const clearReloadFlags = () => {
      if (assetsLookLoaded()) {
        sessionStorage.removeItem(STATIC_RELOAD_KEY);
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      }
    };

    clearReloadFlags();
    const okTimer = window.setTimeout(clearReloadFlags, 2000);

    const reloadOnce = (key: string, reason: string) => {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      console.warn(`[orion-dev] ${reason} — rechargement automatique…`);
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const msg = event.message ?? '';
      if (/ChunkLoadError|Loading chunk \d+ failed/i.test(msg)) {
        reloadOnce(CHUNK_RELOAD_KEY, 'ChunkLoadError');
      }
    };

    const onResourceError = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLScriptElement) && !(target instanceof HTMLLinkElement)) return;
      const url =
        target instanceof HTMLScriptElement
          ? target.src
          : target instanceof HTMLLinkElement
            ? target.href
            : '';
      if (!url.includes('/_next/static/')) return;
      reloadOnce(STATIC_RELOAD_KEY, `Asset Next introuvable (${url})`);
    };

    window.addEventListener('error', onError);
    window.addEventListener('error', onResourceError, true);

    const lateCheck = window.setTimeout(() => {
      if (!assetsLookLoaded() && document.body?.innerText?.includes('__next')) {
        reloadOnce(STATIC_RELOAD_KEY, 'CSS/chunks Next non détectés après chargement');
      }
    }, 3500);

    return () => {
      clearTimeout(okTimer);
      clearTimeout(lateCheck);
      window.removeEventListener('error', onError);
      window.removeEventListener('error', onResourceError, true);
    };
  }, []);

  return null;
}
