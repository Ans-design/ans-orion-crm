import type { ChipAdminEntry } from '@/lib/admin-config/types';
import { sortPOSOptions } from '@/lib/pos/sort-pos-options';

export type ResolvedChipOption = {
  label: string;
  selectable: boolean;
  greyed: boolean;
};

/** Applique visibilité admin + ordre (Admin `order` ou tri métier). */
export function resolveChipOptions(
  fieldKey: string,
  options: string[],
  adminChips: Record<string, ChipAdminEntry>,
): ResolvedChipOption[] {
  const byLabel = new Map<string, ChipAdminEntry>();
  for (const chip of Object.values(adminChips)) {
    if (chip.fieldKey === fieldKey) byLabel.set(chip.label, chip);
  }

  const visible = options
    .map((label) => {
      const chip = byLabel.get(label);
      const greyed = chip?.visibility === 'DISABLED_VISIBLE';
      return {
        label,
        selectable: !greyed,
        greyed,
      };
    })
    .filter((o) => {
      const chip = byLabel.get(o.label);
      if (chip?.archived) return false;
      return !chip || chip.visibility !== 'HIDDEN';
    });

  const hasExplicitAdminOrder = visible.some((o) => {
    const chip = byLabel.get(o.label);
    return chip != null && chip.source === 'admin' && Number.isFinite(chip.order);
  });

  let orderedLabels: string[];
  if (hasExplicitAdminOrder) {
    orderedLabels = [...visible]
      .sort((a, b) => {
        const oa = byLabel.get(a.label)?.order ?? 9_999;
        const ob = byLabel.get(b.label)?.order ?? 9_999;
        if (oa !== ob) return oa - ob;
        return options.indexOf(a.label) - options.indexOf(b.label);
      })
      .map((o) => o.label);
  } else {
    orderedLabels = sortPOSOptions(fieldKey, visible.map((o) => o.label));
  }

  const byResolved = new Map(visible.map((o) => [o.label, o]));
  return orderedLabels
    .map((label) => byResolved.get(label))
    .filter((o): o is ResolvedChipOption => o != null);
}
