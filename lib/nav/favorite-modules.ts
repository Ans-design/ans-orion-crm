const STORAGE_KEY = 'orion:favorite-nav';
const MAX_FAVORITES = 6;

export type FavoriteNavItem = {
  href: string;
  label: string;
};

function read(): FavoriteNavItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteNavItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: FavoriteNavItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function getFavoriteModules(): FavoriteNavItem[] {
  return read().filter((item) => item.href && item.label).slice(0, MAX_FAVORITES);
}

export function isFavoriteModule(href: string): boolean {
  return read().some((x) => x.href === href);
}

/**
 * Ajoute / retire un favori. Cap prototype = 6 (évince le plus ancien si plein).
 * @returns true si désormais favori
 */
export function toggleFavoriteModule(item: FavoriteNavItem): boolean {
  const href = item.href.trim();
  const label = item.label.trim();
  if (!href || !label) return false;

  const list = read().filter((x) => x.href && x.label);
  const exists = list.some((x) => x.href === href);
  if (exists) {
    write(list.filter((x) => x.href !== href));
    return false;
  }
  const next = [...list, { href, label }];
  while (next.length > MAX_FAVORITES) next.shift();
  write(next);
  return true;
}

export { MAX_FAVORITES as ORION_FAVORITES_MAX };
