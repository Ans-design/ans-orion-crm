'use client';

/** @deprecated Remplacé par AdminBackofficeNav (rail 11 hubs) — conservé (zéro suppression). */

import {
  ADMIN_BACKOFFICE_HUBS,
  hubForTab,
  subTabsForHub,
} from '@/lib/backoffice/backoffice-hubs';
import type { AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';

type Props = {
  active: AdminBackofficeTabId;
  onChange: (tab: AdminBackofficeTabId) => void;
  anomalyCount?: number;
  materialsDraftCount?: number;
};

export function AdminBackofficeTabs({
  active,
  onChange,
  anomalyCount = 0,
  materialsDraftCount = 0,
}: Props) {
  const activeHub = hubForTab(active);
  const subTabs = subTabsForHub(activeHub.id) as { id: AdminBackofficeTabId; label: string }[];

  return (
    <div className="ab2-tabs-wrap">
      <nav className="ab2-tabs ab2-tabs-hubs" aria-label="Hubs Backoffice">
        {ADMIN_BACKOFFICE_HUBS.map((hub) => {
          const isActive = hub.id === activeHub.id;
          const badge =
            hub.id === 'audit' && anomalyCount > 0
              ? anomalyCount
              : hub.id === 'stock' && materialsDraftCount > 0
                ? materialsDraftCount
                : 0;

          return (
            <button
              key={hub.id}
              type="button"
              className={`ab2-tab ab2-hub-tab${isActive ? ' active' : ''}`}
              onClick={() => onChange(hub.defaultTab)}
              title={hub.description}
            >
              {hub.label}
              {badge > 0 && (
                <span
                  className={`ab2-badge ml-1 ${hub.id === 'audit' ? 'ab2-badge-danger' : 'ab2-badge-warning'}`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {subTabs.length > 0 && (
        <nav className="ab2-subtabs" aria-label={`Sous-onglets ${activeHub.label}`}>
          {subTabs.map((t: { id: AdminBackofficeTabId; label: string }) => (
            <button
              key={t.id}
              type="button"
              className={`ab2-subtab${active === t.id ? ' active' : ''}`}
              onClick={() => onChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
