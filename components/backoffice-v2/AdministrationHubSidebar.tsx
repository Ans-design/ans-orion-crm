'use client';

/** @deprecated Remplacé par AdminBackofficeNav — conservé (zéro suppression). */

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { listAdministrationHubNav } from '@/lib/administration/routes';
import type { AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';

type Props = {
  activeTab: AdminBackofficeTabId;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

function tabFromHref(href: string): AdminBackofficeTabId | null {
  const match = href.match(/[?&]tab=([^&]+)/);
  return match ? (match[1] as AdminBackofficeTabId) : null;
}

export function AdministrationHubSidebar({ activeTab, collapsed = false }: Props) {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const hubs = listAdministrationHubNav();
  const currentHref = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ''}`;

  return (
    <aside
      className={`ab2-admin-sidebar${collapsed ? ' collapsed' : ''}`}
      aria-label="Navigation Administration — 11 hubs"
    >
      <div className="ab2-admin-sidebar-title">Administration</div>
      <nav className="ab2-admin-sidebar-nav">
        {hubs.map((hub) => {
          const hubActive = hub.items.some((item) => {
            const itemTab = tabFromHref(item.href);
            return itemTab === activeTab || currentHref === item.href;
          });
          return (
            <div key={hub.id} className={`ab2-admin-hub${hubActive ? ' active' : ''}`}>
              <div className="ab2-admin-hub-label">{hub.label}</div>
              {!collapsed && (
                <ul className="ab2-admin-hub-items">
                  {hub.items.map((item) => {
                    const itemTab = tabFromHref(item.href);
                    const isActive =
                      currentHref === item.href
                      || (itemTab != null && itemTab === activeTab && pathname.includes('/backoffice'));
                    return (
                      <li key={item.slug}>
                        <Link
                          href={item.href}
                          className={`ab2-admin-hub-link${isActive ? ' active' : ''}`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
