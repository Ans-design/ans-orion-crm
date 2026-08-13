'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { uxToast } from '@/lib/ux/feedback';
import {
  Palette,
  Save,
  Sun,
  Moon,
  ArrowLeft,
  Check,
  Contrast,
  Pipette,
  Layers,
} from 'lucide-react';
import {
  ACCENT_OPTIONS,
  DARK_PALETTE_OPTIONS,
  DEFAULT_APPEARANCE,
  THEME_STORAGE_KEY,
  applyAppearanceToDocument,
  persistLocalTheme,
  applyThemeNow,
  type AccentId,
  type DarkPaletteId,
} from '@/lib/settings-defaults';
import { AppButton } from '@/components/ui/app-ui';
import { cn } from '@/lib/utils';

type AppearancePrefs = typeof DEFAULT_APPEARANCE & {
  theme: 'light' | 'dark';
  accent: AccentId;
  darkPalette: DarkPaletteId;
};

export default function ApparencePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [prefs, setPrefs] = useState<AppearancePrefs>({
    ...DEFAULT_APPEARANCE,
    theme: 'light',
  });
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/settings?category=appearance')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        let localTheme: 'light' | 'dark' | null = null;
        try {
          const raw = localStorage.getItem(THEME_STORAGE_KEY);
          if (raw === 'dark' || raw === 'light') localTheme = raw;
        } catch {
          /* ignore */
        }
        const nextTheme = localTheme ?? (d.theme === 'dark' ? 'dark' : 'light');
        const next = {
          ...DEFAULT_APPEARANCE,
          ...d,
          theme: nextTheme,
          accent: (d.accent as AccentId) || DEFAULT_APPEARANCE.accent,
          darkPalette: (d.darkPalette as DarkPaletteId) || DEFAULT_APPEARANCE.darkPalette,
        } as AppearancePrefs;
        setPrefs(next);
        applyAppearanceToDocument(next);
        if (!localTheme) {
          setTheme(nextTheme);
          persistLocalTheme(nextTheme);
        }
      })
      .catch(() => { console.warn('[apparence] fetch secondary failed'); });
  }, [setTheme]);

  useEffect(() => {
    if (!mounted) return;
    applyAppearanceToDocument(prefs);
  }, [prefs, mounted]);

  /** Aligne la carte Thème si bascule depuis le header. */
  useEffect(() => {
    if (!mounted) return;
    const fromShell = theme === 'dark' || theme === 'light' ? theme : null;
    if (!fromShell) return;
    setPrefs((p) => (p.theme === fromShell ? p : { ...p, theme: fromShell }));
  }, [theme, mounted]);

  const patch = (partial: Partial<AppearancePrefs>) => {
    setPrefs((p) => ({ ...p, ...partial }));
    setDirty(true);
  };

  const selectTheme = (id: 'light' | 'dark') => {
    patch({ theme: id });
    setTheme(id);
    applyThemeNow(id);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...prefs, theme: prefs.theme === 'dark' ? 'dark' : 'light' };
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'appearance', data: payload }),
      });
      if (r.ok) {
        setTheme(payload.theme);
        persistLocalTheme(payload.theme as 'light' | 'dark');
        applyAppearanceToDocument(payload);
        setDirty(false);
        uxToast.success('Apparence enregistrée');
      } else {
        uxToast.error('Erreur de sauvegarde');
      }
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSaving(false);
  };

  if (!mounted) {
    return (
      <div className="dashboard-full max-w-2xl mx-auto py-12 text-sm text-muted-foreground">
        Chargement de l’apparence…
      </div>
    );
  }

  const activeTheme = (theme === 'dark' || resolvedTheme === 'dark' ? 'dark' : 'light') as
    | 'light'
    | 'dark';

  return (
    <div className="dashboard-full w-full max-w-2xl mx-auto space-y-5 pb-8">
      <div className="space-y-3">
        <Link
          href="/parametres"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} aria-hidden /> Retour Mon compte
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Apparence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Thème, couleur d’accent et palette sombre — appliqués tout de suite sur toute l’app (sidebar, boutons, ticker, Talk…).
          </p>
        </div>
      </div>

      {/* Thème */}
      <section className="rounded-[7px] border border-border bg-card overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <Contrast size={15} className="text-[var(--accent-primary,#FF174D)]" aria-hidden />
          <h2 className="text-sm font-semibold">Thème</h2>
        </header>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: 'light' as const, label: 'Clair', icon: Sun, preview: 'bg-[#f4f6f9] text-[#0f172a]' },
                { id: 'dark' as const, label: 'Sombre', icon: Moon, preview: 'bg-[#0b1220] text-[#e2e8f0]' },
              ] as const
            ).map(({ id, label, icon: Icon, preview }) => {
              const selected = prefs.theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectTheme(id)}
                  className={cn(
                    'relative flex flex-col gap-2 rounded-[7px] border-2 p-3 text-left transition-all min-h-[96px]',
                    selected
                      ? 'border-[var(--accent-primary,#FF174D)] shadow-[0_0_0_3px_var(--accent-primary-soft,rgba(255,23,77,0.15))]'
                      : 'border-border hover:border-muted-foreground/40',
                  )}
                  aria-pressed={selected}
                >
                  <div className={cn('h-10 rounded-[5px] border border-black/10 flex items-center justify-center', preview)}>
                    <Icon size={18} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{label}</span>
                    {selected ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-[7px] bg-[var(--accent-primary,#FF174D)] text-white">
                        <Check size={12} strokeWidth={3} aria-hidden />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Actif maintenant : <strong className="text-foreground">{activeTheme === 'dark' ? 'Sombre' : 'Clair'}</strong>
            {dirty ? ' · modifications non enregistrées' : ''}
          </p>
        </div>
      </section>

      {/* Accent */}
      <section className="rounded-[7px] border border-border bg-card overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <Pipette size={15} className="text-[var(--accent-primary,#FF174D)]" aria-hidden />
          <h2 className="text-sm font-semibold">Couleur d&apos;accent</h2>
        </header>
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Change les boutons, sidebar, ticker LIVE, ANS Talk, fonds légers — partout dans ORION.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {ACCENT_OPTIONS.map((opt) => {
              const selected = prefs.accent === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch({ accent: opt.id })}
                  className={cn(
                    'flex items-center gap-2.5 rounded-[7px] border-2 p-2.5 text-left transition-all min-h-[52px]',
                    selected
                      ? 'border-[var(--accent-primary,#FF174D)] bg-[color-mix(in_srgb,var(--accent-primary,#FF174D)_8%,transparent)]'
                      : 'border-border hover:border-muted-foreground/40',
                  )}
                  aria-pressed={selected}
                >
                  <span
                    className={cn(
                      'h-9 w-9 shrink-0 rounded-[7px] border-2 shadow-sm',
                      selected ? 'border-white ring-2 ring-offset-1 ring-offset-background' : 'border-black/10',
                    )}
                    style={{ background: opt.color, ['--tw-ring-color' as string]: opt.color }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold truncate">{opt.label}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">{opt.hint}</span>
                  </span>
                  {selected ? (
                    <Check size={14} className="ml-auto shrink-0 text-[var(--accent-primary,#FF174D)]" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Palette sombre */}
      {prefs.theme === 'dark' ? (
        <section className="rounded-[7px] border border-border bg-card overflow-hidden">
          <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <Layers size={15} className="text-[var(--accent-primary,#FF174D)]" aria-hidden />
            <h2 className="text-sm font-semibold">Palette sombre</h2>
          </header>
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Ambiance des fonds en mode sombre — indépendante de la couleur d’accent.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DARK_PALETTE_OPTIONS.map((opt) => {
                const selected = prefs.darkPalette === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ darkPalette: opt.id })}
                    className={cn(
                      'flex items-center gap-3 rounded-[7px] border-2 p-3 text-left transition-all',
                      selected
                        ? 'border-[var(--accent-primary,#FF174D)] bg-[color-mix(in_srgb,var(--accent-primary,#FF174D)_8%,transparent)]'
                        : 'border-border hover:border-muted-foreground/40',
                    )}
                    aria-pressed={selected}
                  >
                    <span
                      className="h-11 w-11 shrink-0 rounded-[7px] border border-white/10 shadow-inner"
                      style={{ background: opt.preview }}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{opt.label}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{opt.hint}</span>
                    </span>
                    {selected ? (
                      <Check size={16} className="ml-auto shrink-0 text-[var(--accent-primary,#FF174D)]" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Densité */}
      <section className="rounded-[7px] border border-border bg-card overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <Palette size={15} className="text-[var(--accent-primary,#FF174D)]" aria-hidden />
          <h2 className="text-sm font-semibold">Densité & affichage</h2>
        </header>
        <div className="divide-y divide-border">
          <label className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium">Interface compacte</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                Réduit paddings et cartes pour afficher plus d’infos à l’écran
              </span>
            </span>
            <input
              type="checkbox"
              checked={prefs.density === 'compact'}
              onChange={(e) => patch({ density: e.target.checked ? 'compact' : 'comfortable' })}
              className="h-5 w-5 shrink-0 rounded accent-[var(--accent-primary,#FF174D)]"
            />
          </label>
          <label className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium">Barre CMJN</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                Bandeau calibration couleur en haut de l’application
              </span>
            </span>
            <input
              type="checkbox"
              checked={prefs.showCmjnBar}
              onChange={(e) => patch({ showCmjnBar: e.target.checked })}
              className="h-5 w-5 shrink-0 rounded accent-[var(--accent-primary,#FF174D)]"
            />
          </label>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-col sm:flex-row gap-2">
        <AppButton
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex-1 gap-2 min-h-[44px] justify-center"
        >
          <Save size={16} /> {saving ? 'Enregistrement…' : dirty ? 'Enregistrer les modifications' : 'Enregistrer'}
        </AppButton>
      </div>
    </div>
  );
}
