/** Classes UI partagées — chips POS Soft UI (neutres → sélection ANS) */

export const POS_CHIP_SIZE = {
  default: 'px-3.5 py-2.5',
  compact: 'px-3 py-2',
} as const;

export const POS_CHIP_BASE =
  'pos-chip rounded-[var(--orion-radius,7px)] text-[11px] font-medium leading-tight transition-all duration-200 orion-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF174D] focus-visible:ring-offset-1';

export function posChipClassName(opts: {
  selected: boolean;
  disabled?: boolean;
  greyed?: boolean;
}): string {
  const { selected, disabled, greyed } = opts;
  if (selected) {
    return `${POS_CHIP_BASE} is-selected chip-selected-accent`;
  }
  if (disabled || greyed) {
    return `${POS_CHIP_BASE} bg-muted/50 text-muted-foreground/60 cursor-not-allowed line-through border border-border opacity-60`;
  }
  return `${POS_CHIP_BASE} orion-chip-idle`;
}
