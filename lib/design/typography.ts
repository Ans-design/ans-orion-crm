/**
 * Tokens typographiques ANS ORION — classes Tailwind centralisées.
 * Utiliser ces constantes plutôt que des tailles dispersées.
 */

export const TYPO = {
  pageTitle: 'text-xl md:text-2xl font-semibold tracking-tight leading-tight text-foreground',
  sectionTitle: 'text-lg font-semibold leading-snug text-foreground',
  sectionTitleMd: 'text-xl font-semibold leading-snug text-foreground',
  cardTitle: 'text-base font-semibold leading-normal text-foreground',
  subsectionTitle: 'text-sm font-semibold leading-normal text-foreground',
  body: 'text-sm leading-5 text-foreground',
  bodyMuted: 'text-sm leading-5 text-muted-foreground',
  bodyBase: 'text-base leading-6 text-foreground',
  label: 'text-sm font-medium leading-5 text-foreground',
  meta: 'text-xs leading-4 text-muted-foreground',
  metaCaps: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  kpiValue: 'text-xl md:text-2xl font-semibold tabular-nums leading-tight text-foreground',
  kpiValueCompact: 'text-lg font-semibold tabular-nums leading-tight text-foreground',
  kpiLabel: 'text-xs font-medium text-muted-foreground',
  amount: 'font-mono text-sm font-semibold tabular-nums',
  amountLg: 'font-mono text-base font-semibold tabular-nums',
  code: 'font-mono text-xs tabular-nums tracking-normal',
  codeMd: 'font-mono text-sm font-semibold tabular-nums tracking-tight',
  badge: 'text-xs font-medium leading-none',
  button: 'text-sm font-semibold leading-none',
  buttonSecondary: 'text-sm font-medium leading-none',
  tab: 'text-sm font-medium',
  tabActive: 'text-sm font-semibold',
  tableHead: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  tableCell: 'text-sm leading-5',
  tableCellMuted: 'text-xs leading-4 text-muted-foreground',
} as const;

export type TypoToken = keyof typeof TYPO;
