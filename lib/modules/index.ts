import { canAccessPage } from '@/lib/page-access';
import { MODULE_REGISTRY } from './module-registry';
import { resolveRoleProfile } from './role-registry';
import { canViewModule } from './permission-matrix';
import { shouldSkipDuplicateWorkspaceLink } from './mon-espace-registry';
import type { PermissionFlags } from './types';

export type ModuleAccessMap = Record<string, Partial<PermissionFlags>>;

export type BuiltNavItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof import('lucide-react').LayoutDashboard;
};

export type BuiltNavGroup = {
  label?: string;
  items: BuiltNavItem[];
};

function isModuleVisible(authRole: string, moduleId: string, moduleAccess?: ModuleAccessMap): boolean {
  const override = moduleAccess?.[moduleId];
  if (override && override.canView === false) return false;
  if (override && override.canView === true) return true;
  return canViewModule(authRole, moduleId, override);
}

export function buildNavForRole(authRole: string, moduleAccess?: ModuleAccessMap): BuiltNavGroup[] {
  const profile = resolveRoleProfile(authRole);
  const groups: BuiltNavGroup[] = [];
  let current: BuiltNavGroup = { items: [] };
  let inMonEspaceSection = false;

  const flush = () => {
    if (current.items.length > 0 || current.label) {
      groups.push(current);
    }
    current = { items: [] };
  };

  for (const entry of profile.nav) {
    if (entry.type === 'divider') {
      inMonEspaceSection = false;
      flush();
      continue;
    }
    if (entry.type === 'label') {
      inMonEspaceSection = entry.text === 'Mon espace';
      if (current.items.length > 0) flush();
      current = { label: entry.text, items: [] };
      continue;
    }
    if (shouldSkipDuplicateWorkspaceLink(profile.id, entry.moduleId, inMonEspaceSection)) continue;
    const mod = MODULE_REGISTRY[entry.moduleId];
    if (!mod || mod.status === 'hidden') continue;
    if (!isModuleVisible(authRole, mod.id, moduleAccess)) continue;
    if (!canAccessPage(authRole, mod.href)) continue;
    current.items.push({
      id: mod.id,
      label: mod.label,
      href: mod.href,
      icon: mod.icon,
    });
  }
  flush();

  return groups.filter((g) => g.items.length > 0);
}

export function flattenNavItems(authRole: string, moduleAccess?: ModuleAccessMap): BuiltNavItem[] {
  return buildNavForRole(authRole, moduleAccess).flatMap((g) => g.items);
}

export type SidebarSection =
  | { kind: 'label'; text: string }
  | { kind: 'divider' }
  | { kind: 'item'; item: BuiltNavItem };

/** Structure plate pour OrionSidebar */
export function buildSidebarSections(authRole: string, moduleAccess?: ModuleAccessMap): SidebarSection[] {
  const profile = resolveRoleProfile(authRole);
  const sections: SidebarSection[] = [];
  let inMonEspaceSection = false;

  for (const entry of profile.nav) {
    if (entry.type === 'divider') {
      inMonEspaceSection = false;
      sections.push({ kind: 'divider' });
      continue;
    }
    if (entry.type === 'label') {
      inMonEspaceSection = entry.text === 'Mon espace';
      sections.push({ kind: 'label', text: entry.text });
      continue;
    }
    if (shouldSkipDuplicateWorkspaceLink(profile.id, entry.moduleId, inMonEspaceSection)) continue;
    const mod = MODULE_REGISTRY[entry.moduleId];
    if (!mod || mod.status === 'hidden') continue;
    if (!isModuleVisible(authRole, mod.id, moduleAccess)) continue;
    if (!canAccessPage(authRole, mod.href)) continue;
    sections.push({
      kind: 'item',
      item: { id: mod.id, label: mod.label, href: mod.href, icon: mod.icon },
    });
  }
  return sections;
}

export { resolveRoleProfile, getHomeRouteForRole } from './role-registry';
export { MODULE_REGISTRY, listActiveModules } from './module-registry';
export { getModulePermissions, canViewModule } from './permission-matrix';
export { ORION_ROADMAP, getRoadmapProgress } from './roadmap';
