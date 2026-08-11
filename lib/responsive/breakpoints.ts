/**
 * V15 — Breakpoints canoniques (source unique TS ↔ CSS/Tailwind).
 * phone < 768 | tablet 768–1279 | desktop ≥ 1280
 */

export const BP = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type ResponsiveMode = 'phone' | 'tablet' | 'desktop';

export function modeFromWidth(widthPx: number): ResponsiveMode {
  if (widthPx < BP.md) return 'phone';
  if (widthPx < BP.xl) return 'tablet';
  return 'desktop';
}

export const RESPONSIVE_MEDIA = {
  phoneMax: `(max-width: ${BP.md - 1}px)`,
  tablet: `(min-width: ${BP.md}px) and (max-width: ${BP.xl - 1}px)`,
  tabletPortrait: `(min-width: ${BP.md}px) and (max-width: ${BP.lg - 1}px)`,
  tabletLandscape: `(min-width: ${BP.lg}px) and (max-width: ${BP.xl - 1}px)`,
  desktop: `(min-width: ${BP.xl}px)`,
  coarsePointer: '(pointer: coarse)',
  finePointer: '(pointer: fine)',
  canHover: '(hover: hover)',
} as const;

/** Tailwind class helpers — desktop shell starts at xl, not lg. */
export const SHELL_CLASS = {
  /** Sidebar PC complète */
  desktopSidebar: 'hidden xl:flex',
  /** Rail tablette */
  tabletRail: 'hidden md:flex xl:hidden',
  /** Bottom nav smartphone */
  phoneBottomNav: 'md:hidden',
  /** Burger / drawer trigger */
  phoneTabletMenu: 'xl:hidden',
  /**
   * Contenu : rail tablette puis sidebar PC flottante.
   * `--orion-sidebar-offset` = inset gauche + largeur carte + gouttière (voir globals.css).
   */
  contentOffset:
    'md:ml-[var(--orion-tablet-rail-width,72px)] xl:ml-[var(--orion-sidebar-offset,var(--orion-sidebar-width,248px))]',
} as const;
