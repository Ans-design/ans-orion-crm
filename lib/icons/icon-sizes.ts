/** Tailles d'icônes ANS ORION — source unique */
export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  kpi: 20,
  empty: 48,
} as const;

export type IconSizeKey = keyof typeof ICON_SIZES;

/** Niveaux sémantiques */
export const ICON_SIZE_LEVEL = {
  'sidebar-main': ICON_SIZES.lg,
  'sidebar-sub': ICON_SIZES.md,
  topbar: ICON_SIZES.lg,
  'button-primary': ICON_SIZES.lg,
  'button-secondary': ICON_SIZES.md,
  'table-action': ICON_SIZES.md,
  badge: ICON_SIZES.sm,
  kpi: ICON_SIZES.kpi,
  empty: ICON_SIZES.empty,
} as const;

export type IconSizeLevel = keyof typeof ICON_SIZE_LEVEL;

export function getIconSize(level: IconSizeLevel | IconSizeKey): number {
  if (level in ICON_SIZES) return ICON_SIZES[level as IconSizeKey];
  return ICON_SIZE_LEVEL[level as IconSizeLevel];
}
