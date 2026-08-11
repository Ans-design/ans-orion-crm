'use client';

import {
  ADMIN_BACKOFFICE_MODULES,
  moduleById,
  moduleForTab,
} from '@/lib/backoffice/admin-modules';
import type { AdminBackofficeModuleId } from '@/lib/backoffice/admin-modules';
import type { AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';

type Props = {
  activeTab: AdminBackofficeTabId;
  activeModuleId?: AdminBackofficeModuleId | null;
  onSelectModule: (moduleId: AdminBackofficeModuleId) => void;
  syncLabel: string;
  syncDirty: boolean;
  anomalyCount?: number;
  materialsDraftCount?: number;
};

export function AdminBackofficeNav({
  activeTab,
  activeModuleId,
  onSelectModule,
  syncLabel,
  syncDirty,
  anomalyCount = 0,
  materialsDraftCount = 0,
}: Props) {
  const activeModule = activeModuleId
    ? moduleById(activeModuleId)
    : moduleForTab(activeTab);

  return (
    <aside className="ab2-rail" aria-label="Navigation Administration">
      <div className="ab2-rail-brand">
        <span className="ab2-rail-logo">
          ANS <span>ORION</span>
        </span>
        <span className="ab2-rail-tag">Administration ERP</span>
      </div>

      <div className={`ab2-rail-status${syncDirty ? ' is-dirty' : ' is-synced'}`}>
        <span className="ab2-rail-status-dot" aria-hidden />
        <span>{syncLabel}</span>
      </div>

      <nav className="ab2-rail-nav" aria-label="Modules Administration">
        {ADMIN_BACKOFFICE_MODULES.map((mod) => {
          const isActive = mod.id === activeModule.id;
          const Icon = mod.icon;
          let badge = 0;
          let badgeWarn = false;
          if (mod.id === 'audit' && anomalyCount > 0) badge = anomalyCount;
          if (mod.id === 'stock' && materialsDraftCount > 0) {
            badge = materialsDraftCount;
            badgeWarn = true;
          }

          return (
            <button
              key={mod.id}
              type="button"
              className={`ab2-rail-item${isActive ? ' active' : ''}`}
              onClick={() => onSelectModule(mod.id)}
              title={mod.description}
            >
              <Icon strokeWidth={1.75} aria-hidden />
              <span>{mod.label}</span>
              {badge > 0 && (
                <span className={`ab2-rail-badge${badgeWarn ? ' warn' : ''}`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
