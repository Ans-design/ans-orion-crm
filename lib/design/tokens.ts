/** Tokens design ANS ORION — source unique (alignés sur design-tokens / ultra palette) */

export const ORION_COLORS = {
  red500: '#FF174D',
  red600: '#C91443', // hover / dark (ANS.redDark)
  red700: '#A01036',
  pink400: '#FF3366',
  pink500: '#FF174D',
  pink600: '#E0003B',
  gold400: '#FACC15',
  gold500: '#FACC15',
  orange500: '#F59E0B',
  orange600: '#D97706',
  plum700: '#7C2D5A',
  plum900: '#251322',
  navyDeep: '#02030D',
  navy: '#030611',
  navyCard: '#071021',
  ivory: '#F8FAFC',
  cream: '#F1F5F9',
  success: '#16A34A',
  successDark: '#22C55E',
  warning: '#F59E0B',
  warningDark: '#D97706',
  danger: '#DC2626',
  dangerDark: '#EF4444',
  /** Info sémantique — jamais alias brand rouge (#FF174D) */
  info: '#2563EB',
  infoDark: '#1D4ED8',
  infoDarkMode: '#3B82F6',
  /** Alias legacy UI — brand reste rouge ; cyan/violet ≠ info */
  rose: '#FF174D',
  cyan: '#06B6D4',
  violet: '#7C3AED',
} as const;

export const ORION_GRADIENTS = {
  main: 'linear-gradient(135deg, #FF174D 0%, #FF3366 45%, #F59E0B 100%)',
  secondary: 'linear-gradient(135deg, #C91443 0%, #FF174D 55%, #FACC15 100%)',
  gold: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 55%, #FB6A21 100%)',
} as const;

/** Charte ANS ORION V11 : rayons sémantiques control/card/overlay. */
export const ORION_RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  control: '8px',
  card: '12px',
  overlay: '16px',
  DEFAULT: '8px',
} as const;

export const ORION_MOTION = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const ORION_Z = {
  dropdown: 40,
  sticky: 50,
  modal: 60,
  toast: 70,
  talkBubble: 90,
  talkPanel: 100,
} as const;

export const ORION_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ans-pink-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const ORION_CARD_CLASS =
  'bg-[var(--bg-card)] rounded-[var(--orion-radius)] shadow-[var(--shadow-soft)] transition-[background,box-shadow] duration-200 hover:bg-[var(--bg-card-soft)] dark:border dark:border-[var(--border-soft)] dark:shadow-none';

export const ORION_INTERACTIVE_CLASS =
  'transition-all duration-150 hover:brightness-[1.02] active:scale-[0.98]';

/** Spacing scale (multiples de 4/8) — classes Tailwind recommandées */
export const ORION_SPACE = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
} as const;
