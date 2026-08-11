/**
 * Métriques shell responsive — source unique phone / tablet / desktop.
 * Alignées sur les prototypes ORION (bottom-nav ≈ 72) + tokens CSS existants.
 */

/** Hauteur zone utile tab bar (sans safe-area) */
export const ORION_MOBILE_BOTTOM_NAV_PX = 72;

/** Hauteur rail tablette */
export const ORION_TABLET_RAIL_PX = 72;

/** Favoris lanceur (prototype page-more max 6) */
export const ORION_MOBILE_FAVORITES_MAX = 6;

/** CSS var names (sync :root / LayoutInsets) */
export const ORION_SHELL_CSS = {
  bottomNav: '--orion-bottom-nav-height',
  tabletRail: '--orion-tablet-rail-width',
  insetBottom: '--orion-inset-bottom',
} as const;
