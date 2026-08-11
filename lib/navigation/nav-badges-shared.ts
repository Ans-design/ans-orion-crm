/** Types & helpers badges sidebar — safe client + server (sans Prisma) */

export type NavBadgeCounts = {
  commandes: number;
  devis: number;
  reclamations: number;
  ansTalk: number;
  stockAlerts: number;
  tasksOpen: number;
  livraisons: number;
};

export type NavBadgeKey = keyof NavBadgeCounts;

export const EMPTY_NAV_BADGES: NavBadgeCounts = {
  commandes: 0,
  devis: 0,
  reclamations: 0,
  ansTalk: 0,
  stockAlerts: 0,
  tasksOpen: 0,
  livraisons: 0,
};

export function pickBadgeCount(counts: NavBadgeCounts, key?: NavBadgeKey): number {
  if (!key) return 0;
  return counts[key] ?? 0;
}

export function sumUniverseBadge(
  counts: NavBadgeCounts,
  moduleIds: string[],
  badgeKeys: Partial<Record<string, NavBadgeKey>>,
): number {
  let total = 0;
  const seen = new Set<NavBadgeKey>();
  for (const id of moduleIds) {
    const key = badgeKeys[id];
    if (!key || seen.has(key)) continue;
    seen.add(key);
    total += pickBadgeCount(counts, key);
  }
  return total;
}
