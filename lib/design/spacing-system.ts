/**
 * Échelle d'espacement et tailles ANS ORION — source unique pour cohérence UI.
 * Utiliser ces constantes dans les composants réutilisables ; Tailwind équivalent entre parenthèses.
 */

/** Gouttières grille */
export const ORION_GRID_GAP = {
  compact: 'gap-3',
  standard: 'gap-3 md:gap-4',
  relaxed: 'gap-4 md:gap-6',
} as const;

/** Rythme vertical entre sections */
export const ORION_SECTION_SPACE = {
  tight: 'orion-page-stack--tight',
  standard: 'orion-page-stack',
  relaxed: 'orion-page-stack--relaxed',
} as const;

/** Marges page & conteneur — alignées sur --shell-pad-* (alignment-system.css) */
export const ORION_PAGE = {
  /** Shell `<main>` — géré par .orion-shell-pad / --shell-pad-x */
  shellX: 'orion-shell-pad',
  shellY: '',
  stack: 'orion-page-stack orion-page',
  stackCompact: 'orion-page-stack--tight orion-page',
  stackRelaxed: 'orion-page-stack--relaxed orion-page',
} as const;

/** Header module → contenu */
export const ORION_HEADER = {
  titleDesc: 'gap-2',
  descMt: 'mt-1.5',
  toToolbar: 'mt-4',
  toContent: 'mb-4',
  borderPb: 'pb-4',
} as const;

/** Toolbar & filtres */
export const ORION_TOOLBAR = {
  wrap: 'orion-align-toolbar mb-3',
  dense: 'gap-2',
  actions: 'flex flex-wrap items-center gap-2',
} as const;

/** Onglets → panneau */
export const ORION_TABS = {
  toPanel: 'mt-4',
  panelStack: 'space-y-4',
} as const;

/** Tableaux */
export const ORION_TABLE = {
  head: 'h-10 px-3 py-3',
  cell: 'px-3 py-3',
  cellLoose: 'px-4 py-3',
} as const;

/** Formulaires */
export const ORION_FORM = {
  fieldGap: 'gap-y-4',
  colGap: 'gap-x-4',
  labelMb: 'mb-1.5',
  sectionGap: 'space-y-6',
  actionsMt: 'mt-6',
} as const;

/** Padding cartes */
export const ORION_CARD_PAD = {
  compact: 'p-3',
  standard: 'p-4',
  spacious: 'p-5',
} as const;

/** Hauteurs contrôles — chips / boutons 32px */
export const ORION_CONTROL_HEIGHT = {
  sm: 'h-8',
  md: 'h-8',
  lg: 'h-8',
} as const;

/** KPI */
export const ORION_KPI = {
  minHeight: 'min-h-[96px]',
  minHeightStandard: 'min-h-[112px]',
  iconSize: 16,
  iconSizeKpi: 18,
  valueClass: 'text-sm font-mono font-bold',
  labelClass: 'text-[10px] leading-tight text-[var(--text-secondary)]',
  tilePad: 'p-3',
  tileGap: 'gap-2',
} as const;

/** Grilles responsives */
export const ORION_GRID_KPI = 'orion-align-kpi';

export const ORION_GRID_CARDS = 'orion-align-cards';

/** Spans dashboard 12 colonnes — chaque ligne doit totaliser 12 */
export const ORION_DASHBOARD_SPAN = {
  third: 'card-span-4',
  half: 'card-span-6',
  twoThirds: 'card-span-8',
  full: 'card-span-12',
} as const;

export const ORION_GRID_DASHBOARD = 'dashboard-grid';
export const ORION_GRID_MODULES = 'dashboard-module-grid';
export const ORION_GRID_SPLIT = 'orion-align-split';

export const ORION_GRID_FORM = 'orion-align-form';

/** Sidebar */
export const ORION_SIDEBAR = {
  universeIcon: 18,
  moduleIcon: 16,
  universeRow: 'min-h-10',
  moduleRow: 'min-h-9',
} as const;

/** Badges */
export const ORION_BADGE = {
  sm: 'inline-flex items-center h-5 px-1.5 text-[10px] font-bold rounded-[var(--orion-radius)]',
  md: 'inline-flex items-center h-6 px-2 text-xs font-bold rounded-[var(--orion-radius)]',
} as const;

/** Onglets module */
export const ORION_TAB = {
  bar: 'flex flex-wrap gap-1',
  btn: 'inline-flex items-center justify-center gap-2 h-10 px-3 text-xs font-semibold rounded-[var(--orion-radius)] transition-colors',
  btnActive: 'bg-[var(--ans-red-500)]/10 text-[var(--ans-red-500)]',
  btnIdle: 'text-muted-foreground hover:text-foreground hover:bg-[var(--orion-surface-soft)]',
} as const;
