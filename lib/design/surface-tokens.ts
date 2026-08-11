/** Classes surfaces ORION — alignées sur design-tokens.css + surface-enrichment.css */

export const ORION_SURFACE = {
  chip: 'orion-surface-chip',
  chipActive: 'orion-surface-chip orion-surface-chip--active',
  chipPill: 'orion-surface-chip orion-surface-chip--pill',
  row: 'orion-surface-row',
  rowAlt: 'orion-surface-row orion-surface-row--alt',
  rowSelected: 'orion-surface-row orion-surface-row--selected',
  group: 'orion-surface-group',
  cardSoft: 'orion-surface-card-soft',
  cardElevated: 'orion-surface-card-elevated',
  context: 'orion-surface-context',
  toolbar: 'orion-surface-toolbar',
  table: 'orion-table-enriched',
  badge: 'orion-badge-chip',
} as const;

export const ORION_SURFACE_BG = {
  app: 'bg-app',
  page: 'bg-page',
  panel: 'bg-panel',
  card: 'bg-card-surface',
  cardSoft: 'bg-card-soft',
  chip: 'bg-chip',
  rowAlt: 'bg-row-alt',
  selected: 'bg-selected-soft',
  context: 'bg-context-soft',
} as const;

export const ORION_SURFACE_STATE = {
  hoverSoft: 'orion-hover-soft',
  activeSoft: 'orion-active-soft',
  selectedSoft: 'orion-selected-soft',
} as const;
