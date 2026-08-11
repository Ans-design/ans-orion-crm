'use client';

/**
 * Lanceur mobile ORION — intégration complète prototype + permissions app.
 * Favoris · récents · univers · modules cartes · cmd palette.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Clock3,
  Search,
  Star,
  X,
  ChevronRight,
  LayoutGrid,
  Home,
} from 'lucide-react';
import { buildSidebarUniverses, findUniverseForPath } from '@/lib/navigation/build-sidebar-universes';
import { MODULE_BADGE_KEYS } from '@/lib/navigation/sidebar-universes';
import { useEffectiveModuleAccess } from '@/lib/hooks/use-effective-module-access';
import { useNavBadges } from '@/lib/navigation/use-nav-badges';
import { EMPTY_NAV_BADGES, pickBadgeCount, sumUniverseBadge } from '@/lib/navigation/nav-badges-shared';
import { getRecentModules, pushRecentModule } from '@/lib/nav/recent-modules';
import {
  getFavoriteModules,
  isFavoriteModule,
  toggleFavoriteModule,
  ORION_FAVORITES_MAX,
} from '@/lib/nav/favorite-modules';
import { isNavItemActive } from '@/lib/nav-active';
import {
  ADMIN_MACRO_MODULES,
  macroHubUrl,
} from '@/lib/administration/admin-macro-modules';
import { resolveRoleProfile } from '@/lib/modules';
import { ORION_MOBILE_FAVORITES_MAX } from '@/lib/responsive/shell-metrics';

type Props = {
  role: string;
  onClose: () => void;
  /** Si fourni, navigation via le parent (stack bas / close unifiés). */
  onNavigate?: (href: string, label?: string) => void;
};

type Dest = { id: string; label: string; href: string; icon?: LucideIcon };

export function MobileNavLauncher({ role, onClose, onNavigate }: Props) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const locationSearch = searchParams?.toString() ?? '';
  const router = useRouter();
  const moduleAccess = useEffectiveModuleAccess(role);
  const { badges } = useNavBadges();
  const profile = resolveRoleProfile(role);
  const [recents, setRecents] = useState(() => getRecentModules());
  const [favorites, setFavorites] = useState(() => getFavoriteModules());
  const [favTick, setFavTick] = useState(0);
  const [universeId, setUniverseId] = useState<string | null>(null);

  const universes = useMemo(
    () => buildSidebarUniverses(role, moduleAccess),
    [role, moduleAccess],
  );

  const activeUniverseId = useMemo(
    () => findUniverseForPath(universes, pathname, locationSearch, isNavItemActive),
    [universes, pathname, locationSearch],
  );

  const refreshLocalNav = useCallback(() => {
    setRecents(getRecentModules());
    setFavorites(getFavoriteModules());
    setFavTick((t) => t + 1);
  }, []);

  useEffect(() => {
    refreshLocalNav();
  }, [pathname, refreshLocalNav]);

  const selected = useMemo(
    () => (universeId ? universes.find((u) => u.id === universeId) ?? null : null),
    [universeId, universes],
  );

  const destinations: Dest[] = useMemo(() => {
    if (!selected) return [];
    if (selected.adminNav) {
      return ADMIN_MACRO_MODULES.map((m) => ({
        id: m.id,
        label: m.label,
        href: macroHubUrl(m.id),
        icon: m.icon as Dest['icon'],
      }));
    }
    return selected.items.map((it) => ({
      id: it.id,
      label: it.label,
      href: it.href,
      icon: it.icon as Dest['icon'],
    }));
  }, [selected]);

  const go = (href: string, label?: string) => {
    if (!href) return;
    if (label) {
      pushRecentModule({ href, label });
      setRecents(getRecentModules());
    }
    if (onNavigate) {
      onNavigate(href, label);
      return;
    }
    router.push(href);
    onClose();
  };

  const onToggleFav = (e: React.MouseEvent, href: string, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteModule({ href, label });
    refreshLocalNav();
  };

  const openCmd = () => {
    onClose();
    /* laisse le sheet se démonter avant d’ouvrir la palette */
    window.setTimeout(() => {
      if (typeof window !== 'undefined') {
        (window as Window & { __orionCmdPalettePending?: boolean }).__orionCmdPalettePending = true;
      }
      window.dispatchEvent(new Event('openCommandPalette'));
    }, 80);
  };

  void favTick;

  return (
    <div className="orion-mnav flex h-full min-h-0 flex-col">
      <header className="orion-mnav-chrome shrink-0">
        <div className="orion-mnav-chrome__bar" aria-hidden />
        <div className="orion-mnav-chrome__row">
          {selected ? (
            <button
              type="button"
              onClick={() => setUniverseId(null)}
              className="orion-mnav-chrome__icon-btn"
              aria-label="Retour aux univers"
            >
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
          ) : (
            <span className="orion-mnav-chrome__mark" aria-hidden>
              <LayoutGrid size={15} strokeWidth={2.1} />
            </span>
          )}

          <div className="orion-mnav-chrome__titles min-w-0 flex-1">
            <h1 className="orion-mnav-chrome__title truncate">
              {selected ? selected.label : 'Modules'}
            </h1>
            <span className="orion-mnav-chrome__meta truncate">
              {selected
                ? `${destinations.length} module${destinations.length > 1 ? 's' : ''}`
                : profile?.label || 'Navigation'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="orion-mnav-chrome__icon-btn"
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <button
          type="button"
          onClick={openCmd}
          className="orion-mnav-chrome__search"
          aria-label="Rechercher un module"
        >
          <Search size={14} strokeWidth={2} className="shrink-0 opacity-65" aria-hidden />
          <span className="truncate flex-1">Rechercher…</span>
          <kbd className="orion-mnav-chrome__kbd">⌘K</kbd>
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3">
        {!selected && (
          <>
            {favorites.length > 0 && (
              <section className="mb-4" aria-label="Favoris">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    <Star size={12} className="text-[var(--primary)]" fill="currentColor" aria-hidden />
                    Favoris
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {favorites.length}/{ORION_MOBILE_FAVORITES_MAX || ORION_FAVORITES_MAX}
                  </span>
                </div>
                <div className="orion-mnav-hrail">
                  {favorites.map((f) => (
                    <button
                      key={f.href}
                      type="button"
                      title={f.label}
                      onClick={() => go(f.href, f.label)}
                      className="orion-mnav-chip"
                    >
                      <strong>{f.label}</strong>
                      <span>{f.href}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {recents.length > 0 && (
              <section className="mb-4" aria-label="Récents">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  <Clock3 size={12} aria-hidden />
                  Récents
                </div>
                <div className="orion-mnav-hrail">
                  {recents.map((r) => (
                    <button
                      key={r.href}
                      type="button"
                      title={r.label}
                      onClick={() => go(r.href, r.label)}
                      className="orion-mnav-chip"
                    >
                      <strong>{r.label}</strong>
                      <span>{r.href}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <button
              type="button"
              onClick={() => go(profile.homeRoute, 'Accueil')}
              className="mb-4 flex w-full min-h-[52px] min-w-0 items-center gap-3 overflow-hidden rounded-[7px] border border-[color-mix(in_srgb,var(--primary)_22%,var(--border-soft))] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] px-3 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] bg-[var(--primary)] text-white">
                <Home size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 overflow-hidden">
                <span className="block truncate text-sm font-bold text-[var(--text-main)]">Mon espace</span>
                <span className="block truncate text-[11px] text-[var(--text-muted)]">{profile.homeRoute}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-[var(--text-muted)]" aria-hidden />
            </button>

            <section aria-label="Univers">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Univers
              </p>
              <div className="orion-mnav-universe-rail mb-3">
                {universes.map((u) => {
                  const Icon = u.icon;
                  const on = activeUniverseId === u.id;
                  return (
                    <button
                      key={`pill-${u.id}`}
                      type="button"
                      title={u.label}
                      onClick={() => setUniverseId(u.id)}
                      className={`orion-mnav-universe-pill ${on ? 'is-active' : ''}`}
                    >
                      <Icon size={14} aria-hidden />
                      <span>{u.shortLabel || u.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {universes.map((u) => {
                  const Icon = u.icon;
                  const badge = u.adminNav
                    ? 0
                    : sumUniverseBadge(
                        badges ?? EMPTY_NAV_BADGES,
                        u.items.map((i) => i.id),
                        MODULE_BADGE_KEYS,
                      );
                  const isActive = activeUniverseId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      title={u.label}
                      onClick={() => setUniverseId(u.id)}
                      className={`orion-mnav-tile relative${isActive ? ' is-current' : ''}`}
                    >
                      <span className="orion-mnav-tile-ico">
                        <Icon size={18} strokeWidth={1.85} aria-hidden />
                      </span>
                      <span className="orion-mnav-tile-label">{u.shortLabel || u.label}</span>
                      {badge > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--primary)] text-[8px] font-bold text-white flex items-center justify-center">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {selected && (
          <section aria-label={`Modules ${selected.label}`}>
            {selected.flowLabel && (
              <p className="mb-3 text-[11px] leading-snug text-[var(--text-muted)]">
                {selected.flowLabel}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 min-w-0">
              {destinations.map((d) => {
                const Icon = d.icon;
                const active = isNavItemActive(pathname, d.href);
                const badgeKey = MODULE_BADGE_KEYS[d.id];
                const badge = badgeKey && badges ? pickBadgeCount(badges, badgeKey) : 0;
                const fav = isFavoriteModule(d.href);
                return (
                  <div key={d.id} className="relative min-w-0">
                    <button
                      type="button"
                      title={d.label}
                      onClick={() => go(d.href, d.label)}
                      className={`orion-mnav-module w-full ${active ? 'is-active' : ''}`}
                    >
                      <span className="orion-mnav-module-icon">
                        {Icon ? <Icon size={18} strokeWidth={1.85} /> : <LayoutGrid size={18} />}
                      </span>
                      <h3>{d.label}</h3>
                      <p className="route">{d.href}</p>
                      {badge > 0 && (
                        <span className="absolute bottom-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--primary)] text-[8px] font-bold text-white flex items-center justify-center">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`absolute top-1.5 right-1.5 z-[1] min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-[7px] ${
                        fav ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                      }`}
                      aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      onClick={(e) => onToggleFav(e, d.href, d.label)}
                    >
                      <Star size={14} fill={fav ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                );
              })}
            </div>
            {destinations.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Aucun module dans cet univers pour votre rôle.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
