'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { buildSidebarUniverses } from '@/lib/navigation/build-sidebar-universes';
import { isNavItemActive } from '@/lib/nav-active';
import { SHELL_CLASS } from '@/lib/responsive/breakpoints';
import { useEffectiveModuleAccess } from '@/lib/hooks/use-effective-module-access';
import { AdministrationMacroNav } from '@/components/administration/AdministrationMacroNav';
import { useAdminMacroBadgeCounts } from '@/lib/hooks/use-admin-macro-badge-counts';
import { pushRecentModule } from '@/lib/nav/recent-modules';

type Props = {
  role: string;
};

/**
 * Rail tablette 72px — même source d’univers que desktop / lanceur mobile.
 * Panneau latéral : modules ou macros Administration.
 */
export function TabletNavRail({ role }: Props) {
  const pathname = usePathname() || '';
  const moduleAccess = useEffectiveModuleAccess(role);
  const universes = useMemo(
    () => buildSidebarUniverses(role, moduleAccess),
    [role, moduleAccess],
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeUniverse, setActiveUniverse] = useState<string | null>(null);
  const adminBadges = useAdminMacroBadgeCounts(
    panelOpen && activeUniverse === 'administration',
  );

  const openUniverse = (id: string) => {
    setActiveUniverse(id);
    setPanelOpen(true);
  };

  const universe = universes.find((u) => u.id === activeUniverse);

  const close = () => setPanelOpen(false);

  const go = (href: string, label?: string) => {
    if (label) pushRecentModule({ href, label });
    close();
  };

  return (
    <>
      <nav
        data-orion-tablet-rail
        className={`${SHELL_CLASS.tabletRail} fixed top-0 left-0 z-40 h-[100dvh] w-[var(--orion-tablet-rail-width,72px)] flex-col items-center gap-1 py-3 border-r border-[var(--border-soft)] bg-surface-panel`}
        aria-label="Navigation tablette"
      >
        {universes.slice(0, 10).map((u) => {
          const Icon = u.icon as LucideIcon;
          const active = u.adminNav
            ? pathname.startsWith('/administration') || pathname.startsWith('/admin')
            : u.items.some((it) => isNavItemActive(pathname, it.href));
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => openUniverse(u.id)}
              className={`min-h-[48px] min-w-[48px] rounded-[7px] inline-flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold ${
                active || activeUniverse === u.id
                  ? 'bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
              }`}
              aria-label={u.label}
              title={u.label}
            >
              <Icon size={20} aria-hidden />
              <span className="truncate max-w-[64px] leading-tight">
                {u.shortLabel || u.label.slice(0, 6)}
              </span>
            </button>
          );
        })}
      </nav>

      {panelOpen && universe && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label={universe.label}>
          <button
            type="button"
            className="absolute inset-0 bg-backdrop/60"
            aria-label="Fermer"
            onClick={close}
          />
          <div className="absolute left-[var(--orion-tablet-rail-width,72px)] top-0 bottom-0 w-[min(320px,72vw)] bg-surface-panel border-r border-[var(--border-soft)] shadow-xl flex flex-col">
            <div className="cmjn-bar shrink-0" aria-hidden />
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-soft)]">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">Univers</p>
                <h2 className="font-bold text-sm truncate">{universe.label}</h2>
              </div>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[7px] hover:bg-[var(--bg-hover)]"
                onClick={close}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {universe.adminNav ? (
                <AdministrationMacroNav
                  pathname={pathname}
                  locationSearch=""
                  badgeCounts={adminBadges}
                  onNavigate={(href, label) => go(href, label)}
                />
              ) : (
                <ul className="space-y-0.5">
                  {universe.items.map((it) => {
                    const Icon = it.icon as LucideIcon | undefined;
                    const on = isNavItemActive(pathname, it.href);
                    return (
                      <li key={it.id}>
                        <Link
                          href={it.href}
                          className={`flex items-center gap-2.5 min-h-[44px] px-3 py-2 rounded-[7px] text-sm min-w-0 ${
                            on
                              ? 'bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] font-semibold text-[var(--primary)]'
                              : 'hover:bg-[var(--bg-hover)] text-[var(--text-main)]'
                          }`}
                          onClick={() => go(it.href, it.label)}
                        >
                          {Icon ? (
                            <Icon size={16} className="shrink-0 opacity-80" aria-hidden />
                          ) : null}
                          <span className="truncate">{it.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
