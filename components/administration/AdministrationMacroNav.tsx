'use client';

import Link from 'next/link';
import {
  ADMIN_MACRO_MODULES,
  macroHubUrl,
  macroNavBadge,
  resolveMacroNavActive,
  type AdminMacroModule,
  type AdminNavBadgeCounts,
} from '@/lib/administration/admin-macro-modules';
import { SidebarBadge } from '@/components/layout/sidebar/sidebar-badge';

type Props = {
  pathname: string;
  locationSearch: string;
  badgeCounts?: AdminNavBadgeCounts;
  onNavigate?: (href: string, label?: string) => void;
  /**
   * Macros déjà autorisées (défense en profondeur).
   * Liste vide → aucun DOM (pas display:none).
   * Défaut = catalogue complet — le parent (`buildSidebarUniverses`) doit déjà
   * avoir gate `canAccessAdministration`.
   */
  macros?: AdminMacroModule[];
};

/**
 * Sidebar Administration — macros plates (sans sous-menus).
 * Matières = supports bruts (papier, vinyle, bâche…) pour articles complexes (livre, flyer multi-couches…).
 * Articles finis = produits complets (Flyer A5, T-shirt, Carte de visite…) vendus tels quels.
 * Formules & moteurs = moteurs de calcul / paliers.
 * Temps & capacités = vitesses atelier / délais (entrée plate, comme Vue d’ensemble).
 */
export function AdministrationMacroNav({
  pathname,
  locationSearch,
  badgeCounts = {},
  onNavigate,
  macros = ADMIN_MACRO_MODULES,
}: Props) {
  if (!macros.length) return null;

  const active = resolveMacroNavActive(pathname, locationSearch);

  return (
    <nav className="orion-admin-macro-nav" aria-label="Modules Administration">
      {macros.map((macro) => {
        const Icon = macro.icon;
        const isActive = active?.macroId === macro.id;
        const href = macroHubUrl(macro.id);
        const badge = macroNavBadge(macro.id, badgeCounts);

        return (
          <Link
            key={macro.id}
            href={href}
            prefetch={false}
            onClick={() => onNavigate?.(href, macro.label)}
            className={`orion-admin-macro-nav-item${isActive ? ' is-active' : ''}`}
            aria-label={macro.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="orion-admin-macro-nav-icon" aria-hidden>
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
            </span>
            <span className="orion-admin-macro-nav-label truncate">{macro.label}</span>
            <SidebarBadge count={badge} />
          </Link>
        );
      })}
    </nav>
  );
}

/** @deprecated Alias — accordéon remplacé par navigation Macro plate */
export const AdministrationAccordionNav = AdministrationMacroNav;
