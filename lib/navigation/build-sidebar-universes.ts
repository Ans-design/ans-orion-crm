import { buildNavForRole, type BuiltNavItem, type ModuleAccessMap } from '@/lib/modules';
import { MODULE_REGISTRY } from '@/lib/modules/module-registry';
import { canAccessAdministration } from '@/lib/navigation/can-access-administration';
import { getHomeRouteForRole } from '@/lib/modules/role-registry';
import {
  SIDEBAR_UNIVERSES,
  type UniverseId,
  resolveUniverseForModule,
  sortItemsByUniverseOrder,
  getUniverseDef,
} from './sidebar-universes';

export type SidebarUniverseNav = {
  id: UniverseId;
  label: string;
  shortLabel: string;
  icon: typeof SIDEBAR_UNIVERSES[0]['icon'];
  flowLabel?: string;
  items: BuiltNavItem[];
  /** Navigation accordéon Administration (une seule sidebar) */
  adminNav?: boolean;
};

/** Rôles dont le home est un workspace — Mon espace en tête. */
function shouldPrioritizeMonEspace(authRole: string): boolean {
  const home = getHomeRouteForRole(authRole);
  return home.startsWith('/workspace/');
}

export function buildSidebarUniverses(
  authRole: string,
  moduleAccess?: ModuleAccessMap,
): SidebarUniverseNav[] {
  const sourceOrder = new Map<string, number>();
  let idx = 0;

  const buckets = new Map<UniverseId, BuiltNavItem[]>();
  for (const u of SIDEBAR_UNIVERSES) {
    buckets.set(u.id, []);
  }

  for (const group of buildNavForRole(authRole, moduleAccess)) {
    for (const item of group.items) {
      if (sourceOrder.has(item.id)) continue;
      sourceOrder.set(item.id, idx++);

      const mod = MODULE_REGISTRY[item.id];
      const universeId = resolveUniverseForModule(item.id, mod?.group);
      const bucket = buckets.get(universeId);
      if (bucket && !bucket.some((i) => i.id === item.id)) {
        bucket.push(item);
      }
    }
  }

  const result: SidebarUniverseNav[] = [];

  for (const def of SIDEBAR_UNIVERSES) {
    const raw = buckets.get(def.id) ?? [];

    if (def.id === 'administration') {
      // Cas spécial : UI = macros plates (pas items registry). Gate = page-access /administration.
      if (!canAccessAdministration(authRole)) continue;
      result.push({
        id: def.id,
        label: def.label,
        shortLabel: def.shortLabel,
        icon: def.icon,
        flowLabel: def.flowLabel,
        items: [],
        adminNav: true,
      });
      continue;
    }

    if (raw.length === 0) continue;

    const items = sortItemsByUniverseOrder(def.id, raw, sourceOrder);
    result.push({
      id: def.id,
      label: def.label,
      shortLabel: def.shortLabel,
      icon: def.icon,
      flowLabel: def.flowLabel,
      items,
    });
  }

  if (shouldPrioritizeMonEspace(authRole)) {
    const monIdx = result.findIndex((u) => u.id === 'mon_espace');
    if (monIdx > 0) {
      const [mon] = result.splice(monIdx, 1);
      result.unshift(mon);
    }
  }

  return result;
}

export function findUniverseForPath(
  universes: SidebarUniverseNav[],
  pathname: string,
  locationSearch: string,
  isActive: (pathname: string, href: string, search: string) => boolean,
): UniverseId | null {
  for (const u of universes) {
    if (u.adminNav && (pathname.startsWith('/administration') || pathname.startsWith('/admin/'))) {
      return u.id;
    }
    if (u.items.some((item) => isActive(pathname, item.href, locationSearch))) {
      return u.id;
    }
  }
  return null;
}

export function flattenUniverseItems(universes: SidebarUniverseNav[]): BuiltNavItem[] {
  return universes.flatMap((u) => u.items);
}

export { getUniverseDef };
