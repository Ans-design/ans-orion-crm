'use client';

/**
 * Zone Favoris / Récents — design desktop référence ORION :
 * deux pastilles côte à côte (actif = plein rouge, inactif = contour rouge).
 */

import { Clock3, Star } from 'lucide-react';
import type { FavoriteNavItem } from '@/lib/nav/favorite-modules';
import type { RecentNavItem } from '@/lib/nav/recent-modules';

type Props = {
  favorites: FavoriteNavItem[];
  recents: RecentNavItem[];
  pathname: string;
  locationSearch: string;
  isActive: (pathname: string, href: string, search: string) => boolean;
  onNavigate: (href: string, label?: string) => void;
  activeTab: 'favorites' | 'recents';
  onTabChange: (tab: 'favorites' | 'recents') => void;
};

export function SidebarQuickAccess({
  favorites,
  recents,
  pathname,
  locationSearch,
  isActive,
  onNavigate,
  activeTab,
  onTabChange,
}: Props) {
  const list = activeTab === 'favorites' ? favorites : recents;

  return (
    <div className="orion-sb-quick" data-section="quick-access">
      <div className="orion-sb-quick-tabs" role="tablist" aria-label="Accès rapides">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'favorites'}
          className={`orion-sb-quick-tab ${activeTab === 'favorites' ? 'orion-sb-quick-tab-active' : ''}`}
          onClick={() => onTabChange('favorites')}
        >
          Favoris
          {favorites.length > 0 ? (
            <span className="orion-sb-quick-tab-count">{favorites.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'recents'}
          className={`orion-sb-quick-tab ${activeTab === 'recents' ? 'orion-sb-quick-tab-active' : ''}`}
          onClick={() => onTabChange('recents')}
        >
          Récents
          {recents.length > 0 ? (
            <span className="orion-sb-quick-tab-count">{recents.length}</span>
          ) : null}
        </button>
      </div>

      <div className="orion-sb-quick-list" role="tabpanel">
        {list.length === 0 ? (
          <p className="orion-sb-quick-empty">
            {activeTab === 'favorites'
              ? 'Aucun favori — étoilez un module dans le menu.'
              : 'Aucun récent pour l’instant.'}
          </p>
        ) : (
          list.map((item) => {
            const Icon = activeTab === 'favorites' ? Star : Clock3;
            const active = isActive(pathname, item.href, locationSearch);
            return (
              <button
                key={`${activeTab}-${item.href}`}
                type="button"
                onClick={() => onNavigate(item.href, item.label)}
                className={`orion-sb-quick-link ${active ? 'orion-sb-item-active' : ''}`}
                title={item.label}
              >
                <Icon
                  size={13}
                  className={activeTab === 'favorites' ? 'text-amber-500 shrink-0' : 'shrink-0 opacity-70'}
                  fill={activeTab === 'favorites' ? 'currentColor' : 'none'}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
