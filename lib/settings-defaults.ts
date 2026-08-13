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
  | 'rose'
  | 'coral'
  | 'crimson'
  | 'fuchsia'
  | 'gold'
  | 'lime'
  | 'forest'
  | 'sky'
  | 'ice'
  | 'indigo'
  | 'navy'
  | 'slate'
  | 'burgundy'
  | 'watermelon'
  | 'blush'
  | 'hotpink'
  | 'vermillon'
  | 'terracotta'
  | 'copper'
  | 'safran'
  | 'kraft'
  | 'mint'
  | 'olive'
  | 'jade'
  | 'seafoam'
  | 'turquoise'
  | 'cobalt'
  | 'royal'
  | 'petrol'
  | 'denim'
  | 'plum'
  | 'lavender'
  | 'orchid'
  | 'graphite'
  | 'cacao'
  | 'champagne';

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
  { id: 'watermelon', label: 'Pastèque', hint: 'Vif / commercial', color: '#F43F5E', hover: '#E11D48', deep: '#BE123C' },
  { id: 'crimson', label: 'Cramoisi', hint: 'Alerte forte', color: '#DC2626', hover: '#B91C1C', deep: '#991B1B' },
  { id: 'vermillon', label: 'Vermillon', hint: 'Encre rouge', color: '#E34234', hover: '#C53030', deep: '#9B1C1C' },
  { id: 'burgundy', label: 'Bordeaux', hint: 'Prestige', color: '#7A1F3D', hover: '#5C1730', deep: '#3F1021' },
  { id: 'hotpink', label: 'Rose flash', hint: 'Campagne / POS', color: '#FF2D92', hover: '#E11D7A', deep: '#BE185D' },
  { id: 'rose', label: 'Rose', hint: 'Créatif / studio', color: '#EC4899', hover: '#DB2777', deep: '#BE185D' },
  { id: 'blush', label: 'Pêche', hint: 'Doux / studio', color: '#FB7185', hover: '#F43F5E', deep: '#E11D48' },
  { id: 'fuchsia', label: 'Fuchsia', hint: 'Studio expressif', color: '#C026D3', hover: '#A21CAF', deep: '#86198F' },
  { id: 'orchid', label: 'Orchidée', hint: 'Studio premium', color: '#C084FC', hover: '#A855F7', deep: '#7E22CE' },
  { id: 'lavender', label: 'Lavande', hint: 'Créa douce', color: '#A78BFA', hover: '#8B5CF6', deep: '#6D28D9' },
  { id: 'plum', label: 'Prune', hint: 'Luxe imprimerie', color: '#6B2D5B', hover: '#541F46', deep: '#3A1530' },
  { id: 'coral', label: 'Corail', hint: 'Urgence atelier', color: '#FF5A36', hover: '#E03E1C', deep: '#B82E12' },
  { id: 'orange', label: 'Orange', hint: 'Énergie atelier', color: '#F97316', hover: '#EA580C', deep: '#C2410C' },
  { id: 'terracotta', label: 'Terre cuite', hint: 'Atelier papier', color: '#C45C26', hover: '#A34B1E', deep: '#7C3816' },
  { id: 'copper', label: 'Cuivre', hint: 'Façonnage', color: '#B87333', hover: '#9A5F28', deep: '#73471E' },
  { id: 'amber', label: 'Ambre', hint: 'Chaleur', color: '#F59E0B', hover: '#D97706', deep: '#B45309' },
  { id: 'safran', label: 'Safran', hint: 'Or chaud / BAT', color: '#E8B923', hover: '#C99A12', deep: '#8B6914' },
  { id: 'gold', label: 'Or', hint: 'Premium / BAT', color: '#C9A227', hover: '#A6851C', deep: '#7C6414' },
  { id: 'champagne', label: 'Champagne', hint: 'Haut de gamme', color: '#C9B037', hover: '#A8942C', deep: '#7A6C1F' },
  { id: 'yellow', label: 'Jaune', hint: 'Alertes & focus', color: '#EAB308', hover: '#CA8A04', deep: '#A16207' },
  { id: 'kraft', label: 'Kraft', hint: 'Papier / packing', color: '#C4A574', hover: '#A88B5E', deep: '#7A6544' },
  { id: 'cacao', label: 'Cacao', hint: 'Packaging luxe', color: '#6F4E37', hover: '#5A3E2C', deep: '#3E2A1E' },
  { id: 'lime', label: 'Citron vert', hint: 'Prod vive', color: '#65A30D', hover: '#4D7C0F', deep: '#3F6212' },
  { id: 'olive', label: 'Olive', hint: 'Nature / offset', color: '#6B8E23', hover: '#556B2F', deep: '#3F4F21' },
  { id: 'emerald', label: 'Émeraude', hint: 'Prod / OK', color: '#10B981', hover: '#059669', deep: '#047857' },
  { id: 'mint', label: 'Menthe', hint: 'Qualité / frais', color: '#2DD4BF', hover: '#14B8A6', deep: '#0F766E' },
  { id: 'jade', label: 'Jade', hint: 'Validation', color: '#00A86B', hover: '#008556', deep: '#006644' },
  { id: 'forest', label: 'Forêt', hint: 'Atelier vert', color: '#15803D', hover: '#166534', deep: '#14532D' },
  { id: 'seafoam', label: 'Écume', hint: 'Imprimerie verte', color: '#2A9D8F', hover: '#1F7A70', deep: '#165E56' },
  { id: 'teal', label: 'Sarcelle', hint: 'Frais', color: '#14B8A6', hover: '#0D9488', deep: '#0F766E' },
  { id: 'turquoise', label: 'Turquoise', hint: 'Signal clair', color: '#14B8C4', hover: '#0E8A94', deep: '#0A656C' },
  { id: 'ice', label: 'Glacier', hint: 'Cyan / frais', color: '#22D3EE', hover: '#06B6D4', deep: '#0E7490' },
  { id: 'sky', label: 'Ciel', hint: 'Logistique', color: '#0EA5E9', hover: '#0284C7', deep: '#0369A1' },
  { id: 'blue', label: 'Bleu', hint: 'Pilotage', color: '#3B82F6', hover: '#2563EB', deep: '#1D4ED8' },
  { id: 'royal', label: 'Royal', hint: 'Institutionnel', color: '#4169E1', hover: '#2F4FCB', deep: '#1E3A8A' },
  { id: 'cobalt', label: 'Cobalt', hint: 'Encre bleue', color: '#0047AB', hover: '#003B8E', deep: '#002D6B' },
  { id: 'navy', label: 'Marine', hint: 'Sérieux', color: '#1E4B8C', hover: '#163A6E', deep: '#0F2A52' },
  { id: 'denim', label: 'Denim', hint: 'Textile / print', color: '#3D5A80', hover: '#2E4663', deep: '#1E3045' },
  { id: 'petrol', label: 'Pétrole', hint: 'Atelier nuit', color: '#164E63', hover: '#0F3A4A', deep: '#0A2833' },
  { id: 'indigo', label: 'Indigo', hint: 'Direction', color: '#4F46E5', hover: '#4338CA', deep: '#3730A3' },
  { id: 'violet', label: 'Violet', hint: 'Premium', color: '#8B5CF6', hover: '#7C3AED', deep: '#6D28D9' },
  { id: 'slate', label: 'Ardoise', hint: 'Neutre pro', color: '#475569', hover: '#334155', deep: '#1E293B' },
  { id: 'graphite', label: 'Graphite', hint: 'Neutre technique', color: '#374151', hover: '#1F2937', deep: '#111827' },
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

/** Clés injectées en inline en mode sombre — à retirer au retour Clair. */
const DARK_PALETTE_VAR_KEYS = Array.from(
  new Set(DARK_PALETTE_OPTIONS.flatMap((p) => Object.keys(p.vars))),
);

/** Surfaces Clair (écrase les inline sombre — fond page blanc, sans teinte). */
const LIGHT_SURFACE_VARS: Record<string, string> = {
  '--bg-app': '#FFFFFF',
  '--bg-page': '#FFFFFF',
  '--bg-soft': '#F8FAFC',
  '--bg-panel': '#FFFFFF',
  '--bg-card': '#FFFFFF',
  '--bg-card-soft': '#F1F5F9',
  '--bg-card-elevated': '#FFFFFF',
  '--bg-hover': '#F1F5F9',
  '--bg-sidebar': '#FFFFFF',
  '--bg-header': '#FFFFFF',
  '--bg-chip': '#F8FAFC',
  '--bg-chip-active': 'rgba(255, 23, 77, 0.1)',
  '--ans-bg-main': '#FFFFFF',
  '--ans-bg-sidebar': '#FFFFFF',
  '--ans-bg-panel': '#FFFFFF',
  '--ans-bg-card': '#FFFFFF',
  '--ans-light-bg': '#FFFFFF',
  '--ans-light-sidebar': '#FFFFFF',
  '--ans-light-panel': '#FFFFFF',
  '--ans-light-card': '#FFFFFF',
  '--cockpit-surface': '#FFFFFF',
  '--cockpit-surface-muted': '#F8FAFC',
  '--orion-surface': '#FFFFFF',
  '--orion-surface-soft': '#F8FAFC',
  '--orion-surface-muted': '#FFFFFF',
  '--orion-surface-hover': '#F1F5F9',
  '--app-surface': '#FFFFFF',
  '--app-surface-soft': '#F8FAFC',
  '--bg-main': '#FFFFFF',
  '--bg-shell': '#FFFFFF',
  '--app-bg': '#FFFFFF',
  '--text-main': '#0F172A',
  '--text-muted': '#64748B',
  '--text-secondary': '#475569',
};

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
  const onPrimary = luminance(accent.color) > 0.72 ? '#0F172A' : '#FFFFFF';
  const soft = rgba(accent.color, 0.12);
  const softStrong = rgba(accent.color, 0.18);
  const glow = rgba(accent.color, 0.35);
  const borderSoft = rgba(accent.color, 0.28);
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

  if (prefs.theme === 'dark') {
    root.classList.add('dark');
  } else if (prefs.theme === 'light') {
    root.classList.remove('dark');
  }

  const isDark =
    prefs.theme === 'dark'
    || (prefs.theme !== 'light' && root.classList.contains('dark'));

  root.style.colorScheme = isDark ? 'dark' : 'light';

  if (isDark) {
    for (const k of Object.keys(LIGHT_SURFACE_VARS)) {
      if (!DARK_PALETTE_VAR_KEYS.includes(k)) {
        root.style.removeProperty(k);
      }
    }
    const palette = resolveDarkPalette(prefs.darkPalette);
    for (const [k, v] of Object.entries(palette.vars)) {
      root.style.setProperty(k, v);
    }
    root.style.setProperty('--bg-active', softStrong);
    root.style.setProperty('--bg-active-soft', soft);
    root.dataset.darkPalette = palette.id;
  } else {
    /* Retirer TOUTES les surfaces sombres inline, sinon --bg-card reste #071021. */
    for (const k of DARK_PALETTE_VAR_KEYS) {
      root.style.removeProperty(k);
    }
    for (const [k, v] of Object.entries(LIGHT_SURFACE_VARS)) {
      root.style.setProperty(k, v);
    }
    /* Pas de teinte d’accent sur le fond page (sinon bandeau lavande à gauche). */
    root.style.setProperty('--bg-active', lightActive);
    root.style.setProperty('--bg-active-soft', soft);
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
    if (!accent && !darkPalette && !theme) return;
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

/** Bascule header / Apparence : persiste + réapplique surfaces tout de suite. */
export function applyThemeNow(theme: 'light' | 'dark'): void {
  persistLocalTheme(theme);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }
  applyStoredAppearanceHints();
}

export { THEME_STORAGE_KEY, ACCENT_STORAGE_KEY, DARK_PALETTE_STORAGE_KEY };
