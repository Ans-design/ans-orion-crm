'use client';

import type { AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import type { AdminModuleDef, AdminModuleQuickLink, AdminModuleTabDef } from '@/lib/backoffice/admin-modules';
import Link from 'next/link';

type BadgeCounts = {
  anomalies?: number;
  drafts?: number;
  materialsDraft?: number;
  unpublished?: number;
};

type Props = {
  module: AdminModuleDef;
  activeTab: AdminBackofficeTabId;
  onSelectTab: (tab: AdminBackofficeTabId) => void;
  badgeCounts?: BadgeCounts;
};

function tabBadge(tab: AdminModuleTabDef, counts: BadgeCounts): number {
  if (!tab.badgeKey) return 0;
  switch (tab.badgeKey) {
    case 'anomalies': return counts.anomalies ?? 0;
    case 'drafts': return counts.drafts ?? 0;
    case 'materials-draft': return counts.materialsDraft ?? 0;
    case 'unpublished': return counts.unpublished ?? 0;
    default: return 0;
  }
}

function QuickLinks({ links }: { links: AdminModuleQuickLink[] }) {
  if (!links.length) return null;
  return (
    <div className="ab2-quick-links">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="ab2-quick-link">
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function AdminModuleTabs({ module, activeTab, onSelectTab, badgeCounts = {} }: Props) {
  if (module.tabs.length === 0 && module.quickLinks?.length) {
    return <QuickLinks links={module.quickLinks} />;
  }

  return (
    <div className="ab2-module-tabs-wrap">
      <div className="ab2-module-tabs" role="tablist" aria-label={`Onglets ${module.label}`}>
        {module.tabs.map((t) => {
          const badge = tabBadge(t, badgeCounts);
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ab2-module-tab${isActive ? ' active' : ''}`}
              onClick={() => onSelectTab(t.id)}
            >
              {t.label}
              {badge > 0 && (
                <span className="ab2-module-tab-badge">{badge > 99 ? '99+' : badge}</span>
              )}
            </button>
          );
        })}
      </div>
      {module.quickLinks && module.quickLinks.length > 0 && (
        <QuickLinks links={module.quickLinks} />
      )}
    </div>
  );
}
