const STORAGE_KEY = 'orion:recent-nav';
const MAX_RECENTS = 5;

export type RecentNavItem = {
  href: string;
  label: string;
  at: number;
};

function read(): RecentNavItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentNavItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: RecentNavItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

export function getRecentModules(): RecentNavItem[] {
  return read()
    .filter((item) => item.href && item.label)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_RECENTS);
}

export function pushRecentModule(item: { href: string; label: string }) {
  const href = item.href.trim();
  const label = item.label.trim();
  if (!href || !label || href === '/login') return;

  const next = [
    { href, label, at: Date.now() },
    ...read().filter((x) => x.href !== href),
  ].slice(0, MAX_RECENTS);

  write(next);
}
