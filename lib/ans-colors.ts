/**
 * Tokens couleurs ANS ORION — alignés sur le runtime CSS (`--primary` / design-tokens).
 * Charte historique #FF174D / #ff1e56 conservée en alias `legacy*` pour migrations.
 */
export const ANS = {
  /** Rouge marque runtime (identique à --primary / --ans-primary) */
  red: '#FF174D',
  redVivid: '#FF174D',
  redDark: '#C91443',
  orange: '#F59E0B',
  yellow: '#FACC15',
  yellowSoft: '#FACC15',
  /** Info / tech — aligné --info (#2563EB), cyan product encore dispo pour chart tech */
  cyan: '#2563EB',
  teal: '#06B6D4',
  textLight: '#f4f4f5',
  textMuted: '#71717a',
  bgDark: '#060608',
  surfaceDark: '#111115',
  surfaceDark2: '#18181f',
  /** Alias charte documentaire (ne plus utiliser pour l’UI live) */
  legacyRed: '#cc0033',
  legacyRedVivid: '#ff1e56',
  legacyYellow: '#eab308',
} as const;

export const ANS_KPI_COLORS = {
  ca: ANS.yellow,
  finance: ANS.red,
  ops: ANS.orange,
  tech: ANS.cyan,
  success: '#22C55E',
} as const;
