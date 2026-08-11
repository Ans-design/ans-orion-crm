import type { ChipAdminEntry, ProductOptionGroup } from './types';

/** Regroupe les chips par champ produit — ProductOptionGroup (client-safe) */
export function groupChipsByField(
  chips: Record<string, ChipAdminEntry>,
  includeArchived = false,
): ProductOptionGroup[] {
  const groups = new Map<string, ProductOptionGroup>();
  for (const chip of Object.values(chips)) {
    if (chip.archived && !includeArchived) continue;
    const key = `${chip.productId}:${chip.fieldKey}`;
    const existing = groups.get(key);
    if (existing) {
      existing.options.push(chip);
    } else {
      groups.set(key, {
        productId: chip.productId,
        fieldKey: chip.fieldKey,
        blockKey: chip.blockKey,
        label: chip.fieldKey,
        type: 'chips',
        options: [chip],
      });
    }
  }
  for (const g of groups.values()) {
    g.options.sort((a, b) => a.order - b.order);
  }
  return [...groups.values()].sort((a, b) =>
    `${a.productId}:${a.fieldKey}`.localeCompare(`${b.productId}:${b.fieldKey}`),
  );
}
