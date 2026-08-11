/** Préférences apparence utilisateur — thème, accent marque, palette sombre, densité. */

export type AccentId =
  | 'cyan' // legacy → rouge vif
  | 'magenta' // legacy → rouge ANS
  | 'yellow'
  | 'amber'
  | 'orange'
  | 'emerald'
  | 'teal'
  | 'blue'
  | 'violet'
  | 'rose';

export type DarkPaletteId = 'midnight' | 'charcoal' | 'forest' | 'plum' | 'ocean';

export const DEFAULT_APPEARANCE = {
  theme: 'light' as 'light' | 'dark' | 'system',
  /** Clés legacy conservées : cyan=vif, magenta=rouge ANS, yellow=jaune. */
  accent: 'magenta' as AccentId,
  /** Surfaces mode sombre (indépendant de l’accent). */
  darkPalette: 'midnight' as DarkPaletteId,
  density: 'comfortable' as 'comfortable' | 'compact',
  showCmjnBar: true,
};

export const DEFAULT_NOTIFICATIONS = {
  devis: true,
  commandes: true,
  paiements: true,
  production: true,
  livraisons: true,
  audit: true,
  factures: true,
  emailAlerts: false,
  alertEmail: '',
  soundEnabled: false,
  desktopEnabled: true,
};

type AccentDef = {
  id: AccentId;
  label: string;
  hint: string;
  /** Couleur principale */
  color: string;
  /** Hover / active (plus sombre) */
  hover: string;
  /** Variante profonde */
  deep: string;
};

/** Accents disponibles — appliqués globalement (sidebar, FAB, ticker, boutons…). */
export const ACCENT_DEFS: AccentDef[] = [
  { id: 'cyan', label: 'Rouge vif', hint: 'Actions principales', color: '#FF174D', hover: '#E0003B', deep: '#B80030' },
  { id: 'magenta', label: 'Rouge ANS', hint: 'Marque ORION', color: '#C91443', hover: '#A01036', deep: '#7A0C29' },
  { id: 'rose', label: 'Rose', hint: 'Créatif / studio', color: '#EC4899', hover: '#DB2777', deep: '#BE185D' },
  { id: 'orange', label: 'Orange', hint: 'Énergie atelier', color: '#F97316', hover: '#EA580C', deep: '#C2410C' },
  { id: 'amber', label: 'Ambre', hint: 'Chaleur', color: '#F59E0B', hover: '#D97706', deep: '#B45309' },
  { id: 'yellow', label: 'Jaune', hint: 'Alertes & focus', color: '#EAB308', hover: '#CA8A04', deep: '#A16207' },
  { id: 'emerald', label: 'Émeraude', hint: 'Prod / OK', color: '#10B981', hover: '#059669', deep: '#047857' },
  { id: 'teal', label: 'Sarcelle', hint: 'Frais', color: '#14B8A6', hover: '#0D9488', deep: '#0F766E' },
  { id: 'blue', label: 'Bleu', hint: 'Pilotage', color: '#3B82F6', hover: '#2563EB', deep: '#1D4ED8' },
  { id: 'violet', label: 'Violet', hint: 'Premium', color: '#8B5CF6', hover: '#7C3AED', deep: '#6D28D9' },
];

export const ACCENT_COLORS: Record<AccentId, string> = Object.fromEntries(
  ACCENT_DEFS.map((d) => [d.id, d.color]),
) as Record<AccentId, string>;

export const ACCENT_OPTIONS = ACCENT_DEFS.map(({ id, label, hint, color }) => ({
  id,
  label,
  hint,
  color,
}));

export type DarkPaletteDef = {
  id: DarkPaletteId;
  label: string;
  hint: string;
  preview: string;
  vars: Record<string, string>;
};

/** Palettes de surfaces pour le mode sombre (choix utilisateur). */
export const DARK_PALETTE_OPTIONS: DarkPaletteDef[] = [
  {
    id: 'midnight',
    label: 'Minuit',
    hint: 'Marine ORION',
    preview: '#02030D',
    vars: {
      '--bg-app': '#02030D',
      '--bg-page': '#030611',
      '--bg-panel': '#050A18',
      '--bg-card': '#071021',
      '--bg-card-elevated': '#091428',
      '--bg-hover': '#0B1830',
      '--bg-sidebar': '#030611',
      '--ans-bg-main': '#02030D',
      '--ans-bg-sidebar': '#030611',
      '--ans-bg-panel': '#050A18',
      '--ans-bg-card': '#071021',
    },
  },
  {
    id: 'charcoal',
    label: 'Charbon',
    hint: 'Gris neutre',
    preview: '#0F1115',
    vars: {
      '--bg-app': '#0F1115',
      '--bg-page': '#12151B',
      '--bg-panel': '#171A21',
      '--bg-card': '#1C2028',
      '--bg-card-elevated': '#222733',
      '--bg-hover': '#2A3140',
      '--bg-sidebar': '#12151B',
      '--ans-bg-main': '#0F1115',
      '--ans-bg-sidebar': '#12151B',
      '--ans-bg-panel': '#171A21',
      '--ans-bg-card': '#1C2028',
    },
  },
  {
    id: 'forest',
    label: 'Forêt',
    hint: 'Vert profond',
    preview: '#06140F',
    vars: {
      '--bg-app': '#06140F',
      '--bg-page': '#0A1A14',
      '--bg-panel': '#0E221A',
      '--bg-card': '#122A20',
      '--bg-card-elevated': '#163328',
      '--bg-hover': '#1B3D30',
      '--bg-sidebar': '#0A1A14',
      '--ans-bg-main': '#06140F',
      '--ans-bg-sidebar': '#0A1A14',
      '--ans-bg-panel': '#0E221A',
      '--ans-bg-card': '#122A20',
    },
  },
  {
    id: 'plum',
    label: 'Prune',
    hint: 'Violet nuit',
    preview: '#120816',
    vars: {
      '--bg-app': '#120816',
      '--bg-page': '#180B1E',
      '--bg-panel': '#1F1028',
      '--bg-card': '#271533',
      '--bg-card-elevated': '#301B3E',
      '--bg-hover': '#3A224B',
      '--bg-sidebar': '#180B1E',
      '--ans-bg-main': '#120816',
      '--ans-bg-sidebar': '#180B1E',
      '--ans-bg-panel': '#1F1028',
      '--ans-bg-card': '#271533',
    },
  },
  {
    id: 'ocean',
    label: 'Océan',
    hint: 'Bleu pétrole',
    preview: '#061018',
    vars: {
      '--bg-app': '#061018',
      '--bg-page': '#0A1620',
      '--bg-panel': '#0E1E2A',
      '--bg-card': '#122636',
      '--bg-card-elevated': '#162E40',
      '--bg-hover': '#1B3850',
      '--bg-sidebar': '#0A1620',
      '--ans-bg-main': '#061018',
      '--ans-bg-sidebar': '#0A1620',
      '--ans-bg-panel': '#0E1E2A',
      '--ans-bg-card': '#122636',
    },
  },
];

const THEME_STORAGE_KEY = 'orion-theme-v5';
const ACCENT_STORAGE_KEY = 'orion-accent-v1';
const DARK_PALETTE_STORAGE_KEY = 'orion-dark-palette-v1';

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace('#', '').trim();
  if (raw.length !== 6) return null;
  const n = Number.parseInt(raw, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Éclaircit un hex vers le blanc (0–1). */
function colorMixLight(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(rgb.r + (255 - rgb.r) * t);
  const g = Math.round(rgb.g + (255 - rgb.g) * t);
  const b = Math.round(rgb.b + (255 - rgb.b) * t);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function resolveAccent(id?: string): AccentDef {
  return ACCENT_DEFS.find((d) => d.id === id) ?? ACCENT_DEFS.find((d) => d.id === 'magenta')!;
}

function resolveDarkPalette(id?: string): DarkPaletteDef {
  return DARK_PALETTE_OPTIONS.find((d) => d.id === id) ?? DARK_PALETTE_OPTIONS[0]!;
}

/** Applique accent / densités / palette sombre / barre CMJN (immédiat, sans reload). */
export function applyAppearanceToDocument(prefs: {
  accent?: string;
  density?: string;
  showCmjnBar?: boolean;
  darkPalette?: string;
  theme?: string;
}): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const accent = resolveAccent(prefs.accent);
  const onPrimary = luminance(accent.color) > 0.55 ? '#0F172A' : '#FFFFFF';
  const soft = rgba(accent.color, 0.12);
  const softStrong = rgba(accent.color, 0.18);
  const glow = rgba(accent.color, 0.35);
  const borderSoft = rgba(accent.color, 0.28);
  const lightApp = `color-mix(in srgb, ${accent.color} 7%, #F4F7FB)`;
  const lightActive = `color-mix(in srgb, ${accent.color} 14%, #FFFFFF)`;

  const brandVars: Record<string, string> = {
    '--primary': accent.color,
    '--primary-hover': accent.hover,
    '--primary-foreground': onPrimary,
    '--talk-accent': accent.color,
    '--talk-accent-2': colorMixLight(accent.color, 0.28),
    '--talk-primary': accent.color,
    '--talk-primary-soft': soft,
    '--accent-brand': accent.color,
    '--accent-primary': accent.color,
    '--accent-primary-hover': accent.hover,
    '--accent-primary-active': accent.hover,
    '--accent-primary-dark': accent.deep,
    '--accent-primary-soft': soft,
    '--brand-primary': accent.color,
    '--brand-primary-hover': accent.hover,
    '--brand-primary-soft': soft,
    '--brand-primary-border': borderSoft,
    '--ans-primary': accent.color,
    '--ans-primary-hover': accent.hover,
    '--ans-primary-active': accent.hover,
    '--ans-primary-dark': accent.deep,
    '--ans-primary-soft': soft,
    '--ans-primary-glow': glow,
    '--ans-red': accent.color,
    '--ans-red-vivid': accent.color,
    '--ans-red-dark': accent.hover,
    '--ans-red-500': accent.color,
    '--ans-red-600': accent.hover,
    '--ans-red-700': accent.deep,
    '--orion-red': accent.color,
    '--orion-red-vivid': accent.color,
    '--orion-red-dark': accent.hover,
    '--orion-red-deep': accent.deep,
    '--orion-gradient-red': accent.color,
    '--ring': accent.color,
    '--bg-active': lightActive,
    '--bg-active-soft': soft,
    '--ans-light-active': lightActive,
    '--border-focus': rgba(accent.color, 0.45),
    '--on-primary': onPrimary,
    '--primary-soft': soft,
    '--primary-soft-strong': softStrong,
  };

  for (const [k, v] of Object.entries(brandVars)) {
    root.style.setProperty(k, v);
  }

  const isDark =
    prefs.theme === 'dark'
    || (prefs.theme !== 'light' && root.classList.contains('dark'));

  if (isDark) {
    const palette = resolveDarkPalette(prefs.darkPalette);
    for (const [k, v] of Object.entries(palette.vars)) {
      root.style.setProperty(k, v);
    }
    root.style.setProperty('--bg-active', softStrong);
    root.style.setProperty('--bg-active-soft', soft);
    root.dataset.darkPalette = palette.id;
  } else {
    /* Teinte légère des fonds selon l’accent (ex. jaune → page tiédie). */
    root.style.setProperty('--bg-app', lightApp);
    root.style.setProperty('--bg-page', lightApp);
    root.style.setProperty('--ans-light-bg', lightApp);
    root.dataset.darkPalette = '';
  }

  root.dataset.accent = accent.id;
  root.dataset.density = prefs.density === 'compact' ? 'compact' : 'comfortable';

  const bar = document.querySelector('.cmjn-bar') as HTMLElement | null;
  if (bar) bar.style.display = prefs.showCmjnBar === false ? 'none' : 'block';

  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent.id);
    if (prefs.darkPalette) {
      localStorage.setItem(DARK_PALETTE_STORAGE_KEY, resolveDarkPalette(prefs.darkPalette).id);
    }
  } catch {
    /* ignore */
  }
}

/** Restaure accent / palette depuis localStorage (avant fetch API). */
export function applyStoredAppearanceHints(): void {
  if (typeof document === 'undefined') return;
  try {
    const accent = localStorage.getItem(ACCENT_STORAGE_KEY) || undefined;
    const darkPalette = localStorage.getItem(DARK_PALETTE_STORAGE_KEY) || undefined;
    const theme = localStorage.getItem(THEME_STORAGE_KEY) || undefined;
    if (!accent && !darkPalette) return;
    applyAppearanceToDocument({
      accent: accent ?? DEFAULT_APPEARANCE.accent,
      darkPalette: (darkPalette as DarkPaletteId) || DEFAULT_APPEARANCE.darkPalette,
      theme: theme === 'dark' ? 'dark' : 'light',
      density: DEFAULT_APPEARANCE.density,
      showCmjnBar: DEFAULT_APPEARANCE.showCmjnBar,
    });
  } catch {
    /* ignore */
  }
}

export function persistLocalTheme(theme: 'light' | 'dark' | 'system'): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme === 'system' ? 'light' : theme);
  } catch {
    /* ignore */
  }
}

export { THEME_STORAGE_KEY, ACCENT_STORAGE_KEY, DARK_PALETTE_STORAGE_KEY };
