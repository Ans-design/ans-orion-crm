'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import {
  ACCENT_STORAGE_KEY,
  DARK_PALETTE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  THEME_STORAGE_KEY,
  applyAppearanceToDocument,
  applyStoredAppearanceHints,
} from '@/lib/settings-defaults';

function readLocalAccentPrefs(themeHint?: string) {
  let accent = DEFAULT_APPEARANCE.accent;
  let darkPalette = DEFAULT_APPEARANCE.darkPalette;
  let theme = themeHint || DEFAULT_APPEARANCE.theme;
  try {
    accent = (localStorage.getItem(ACCENT_STORAGE_KEY) as typeof accent) || accent;
    darkPalette =
      (localStorage.getItem(DARK_PALETTE_STORAGE_KEY) as typeof darkPalette) || darkPalette;
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === 'dark' || t === 'light') theme = t;
  } catch {
    /* ignore */
  }
  return { accent, darkPalette, theme };
}

/** Restaure thème / accent / densité — différé pour ne pas bloquer le 1er paint. */
export function ThemePrefsLoader() {
  const { setTheme, resolvedTheme } = useTheme();
  const loaded = useRef(false);

  useEffect(() => {
    applyStoredAppearanceHints();
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const run = () => {
      fetch('/api/settings?category=appearance')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const prefs = { ...DEFAULT_APPEARANCE, ...(data ?? {}) };

          let hasLocalTheme = false;
          try {
            hasLocalTheme = Boolean(localStorage.getItem(THEME_STORAGE_KEY));
          } catch {
            hasLocalTheme = false;
          }

          if (!hasLocalTheme) {
            const theme = (prefs.theme as string) || 'light';
            setTheme(theme === 'system' ? 'light' : theme);
          }

          const local = readLocalAccentPrefs(
            resolvedTheme === 'dark' ? 'dark' : 'light',
          );
          applyAppearanceToDocument({
            ...prefs,
            /* Local gagne pour feedback immédiat après choix Apparence. */
            accent: local.accent || prefs.accent,
            darkPalette: local.darkPalette || prefs.darkPalette,
            theme:
              local.theme
              || (prefs.theme as string)
              || (resolvedTheme === 'dark' ? 'dark' : 'light'),
          });
        })
        .catch(() => {});
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(run, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(run, 800);
    }
    return () => {
      if (idleId != null && typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [setTheme, resolvedTheme]);

  /* Re-applique teintes quand light ↔ dark change (header / Apparence). */
  useEffect(() => {
    if (!resolvedTheme) return;
    const local = readLocalAccentPrefs(resolvedTheme === 'dark' ? 'dark' : 'light');
    applyAppearanceToDocument({
      accent: local.accent,
      darkPalette: local.darkPalette,
      /* localStorage gagne : évite de réinjecter le sombre si next-themes est en retard. */
      theme: local.theme === 'dark' || local.theme === 'light'
        ? local.theme
        : resolvedTheme === 'dark' ? 'dark' : 'light',
    });
  }, [resolvedTheme]);

  return null;
}
