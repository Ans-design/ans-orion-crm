import { isNavItemActive } from '@/lib/nav-active';
import type { BuiltNavItem } from '@/lib/modules';
import type { SidebarUniverseNav } from './build-sidebar-universes';

export { isNavItemActive };

/** Sous-module / lien feuille actif */
export function isItemActive(
  pathname: string | null | undefined,
  item: Pick<BuiltNavItem, 'href'>,
  search?: string | null,
): boolean {
  return isNavItemActive(pathname, item.href, search);
}

/** Univers parent actif si un enfant correspond à la route courante */
export function isGroupActive(
  group: Pick<SidebarUniverseNav, 'items' | 'adminNav' | 'id'>,
  pathname: string | null | undefined,
  search?: string | null,
): boolean {
  if (group.adminNav && pathname) {
    return pathname.startsWith('/administration') || pathname.startsWith('/admin/');
  }
  return group.items.some((item) => isNavItemActive(pathname, item.href, search));
}

/** Premier enfant actif d'un univers (pour navigation directe mini) */
export function findActiveItemInGroup(
  group: SidebarUniverseNav,
  pathname: string | null | undefined,
  search?: string | null,
): BuiltNavItem | undefined {
  return group.items.find((item) => isNavItemActive(pathname, item.href, search));
}
