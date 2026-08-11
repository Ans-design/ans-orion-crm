/**
 * Direction artistique ANS ORION — référence unique (étape 3).
 * Ne pas dupliquer ces valeurs en dur dans les modules.
 */

import { ORION_COLORS, ORION_GRADIENTS, ORION_MOTION, ORION_RADIUS, ORION_Z } from './tokens';

export const ANS_DESIGN_DIRECTION = {
  name: 'ANS ORION Premium SaaS',
  tagline: 'CRM · ERP · GPAO · POS — imprimerie haut de gamme',

  identity: {
    primary: ORION_COLORS.red500,
    primarySoft: ORION_COLORS.pink500,
    accentGold: ORION_COLORS.gold500,
    accentOrange: ORION_COLORS.orange500,
    darkApp: '#07111F',
    darkCard: '#121E31',
    lightApp: '#FAFAFB',
    lightCard: '#FFFFFF',
    textLight: '#151B26',
    textDark: '#F8F4EE',
  },

  gradients: ORION_GRADIENTS,

  radius: ORION_RADIUS,

  motion: {
    ...ORION_MOTION,
    /** Micro-interactions UI : 150–220 ms */
    micro: '180ms',
  },

  zIndex: ORION_Z,

  typography: {
    sans: 'var(--font-sans), Manrope, system-ui, sans-serif',
    display: 'var(--font-display), Manrope, system-ui, sans-serif',
    mono: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace',
    scale: {
      pageTitle: 'text-xl md:text-2xl font-semibold',
      sectionTitle: 'text-lg font-semibold',
      cardTitle: 'text-base font-semibold',
      body: 'text-sm',
      meta: 'text-xs text-muted-foreground',
      code: 'font-mono text-xs tabular-nums',
      amount: 'font-mono text-sm font-semibold tabular-nums',
    },
  },

  spacing: {
    pageStack: 'space-y-6',
    sectionGap: 'gap-4',
    cardPad: 'p-4',
    toolbarGap: 'gap-3',
  },

  rules: {
    radiusUi: '8px',
    noPureBlack: true,
    redForBrandAndCta: true,
    monoForCodesOnly: true,
    frenchTypography: true,
  },

  forbidden: [
    'Noir pur #000 en fond dominant',
    'Rouge plein sur sous-menu sidebar enfant',
    'rounded-2xl sans raison sur formulaires',
    'text-xs comme corps principal',
    'Card dans card sans hiérarchie visuelle',
    'Styles inline couleur hors tokens',
  ],
} as const;

export type AnsDesignDirection = typeof ANS_DESIGN_DIRECTION;
