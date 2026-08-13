'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, LogOut, Palette, PanelLeftClose, PanelLeftOpen, Search, Settings } from 'lucide-react';
import { isNavItemActive } from '@/lib/nav-active';
import { getRecentModules, pushRecentModule } from '@/lib/nav/recent-modules';
import { getFavoriteModules } from '@/lib/nav/favorite-modules';
import { resolveRoleProfile } from '@/lib/modules';
import {
  buildSidebarUniverses,
  findUniverseForPath,
} from '@/lib/navigation/build-sidebar-universes';
import { OrionLogo } from '@/components/branding/orion-logo';
import { SidebarQuickAccess } from '@/components/layout/sidebar/sidebar-quick-access';

import { SidebarUniverseNav } from '@/components/layout/sidebar/sidebar-universe-nav';
import { useNavBadges } from '@/lib/navigation/use-nav-badges';
import { useEffectiveModuleAccess } from '@/lib/hooks/use-effective-module-access';

const SIDEBAR_WIDTH_EXPANDED = '264px';
const SIDEBAR_WIDTH_MINI = '68px';
const SIDEBAR_COLLAPSED_KEY = 'orion-sidebar-collapsed';
const SIDEBAR_UNIVERSE_KEY = 'orion-sidebar-universe';

type Props = {
  role: string;
  compact?: boolean;
  variant?: 'desktop' | 'drawer';
  onNavigate?: () => void;
};

function openCommandPalette() {
  window.dispatchEvent(new Event('openCommandPalette'));
}

function setSidebarWidth(mini: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(
    '--orion-sidebar-width',
    mini ? SIDEBAR_WIDTH_MINI : SIDEBAR_WIDTH_EXPANDED,
  );
}

export function OrionSidebar({ role, compact, variant = 'desktop', onNavigate }: Props) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const locationSearch = searchParams?.toString() ?? '';
  const router = useRouter();
  const { data: session } = useSession();
  const profile = resolveRoleProfile(role);
  const moduleAccess = useEffectiveModuleAccess(role);
  const [recents, setRecents] = useState<ReturnType<typeof getRecentModules>>([]);
  const [favorites, setFavorites] = useState<ReturnType<typeof getFavoriteModules>>([]);
  const [mini, setMini] = useState(false);
  const [openUniverseId, setOpenUniverseId] = useState<string | null>(null);
  const [flyoutUniverseId, setFlyoutUniverseId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickTab, setQuickTab] = useState<'favorites' | 'recents'>('favorites');
  const { badges } = useNavBadges();
  const userClosedActiveUniverse = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === '1') setMini(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    userClosedActiveUniverse.current = false;
  }, [pathname]);

  useEffect(() => {
    if (variant !== 'desktop') return;
    setSidebarWidth(mini);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, mini ? '1' : '0');
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('orion-sidebar-resize', { detail: { mini } }));
  }, [mini, variant]);

  /** Récents / favoris locaux uniquement — badges via poll partagé (pas à chaque route). */
  useEffect(() => {
    setRecents(getRecentModules());
    setFavorites(getFavoriteModules());
  }, [pathname]);

  const universes = useMemo(
    () => buildSidebarUniverses(role, moduleAccess),
    [role, moduleAccess],
  );

  const activeUniverseId = useMemo(
    () => findUniverseForPath(universes, pathname, locationSearch, isNavItemActive),
    [universes, pathname, locationSearch],
  );

  useEffect(() => {
    if (activeUniverseId && !userClosedActiveUniverse.current) {
      setOpenUniverseId(activeUniverseId);
      return;
    }
    if (!activeUniverseId) {
      try {
        const saved = localStorage.getItem(SIDEBAR_UNIVERSE_KEY);
        if (saved && universes.some((u) => u.id === saved)) {
          setOpenUniverseId(saved);
        }
      } catch { /* ignore */ }
    }
  }, [activeUniverseId, universes]);

  useEffect(() => {
    if (!mini) setFlyoutUniverseId(null);
  }, [mini]);

  useEffect(() => {
    setFlyoutUniverseId(null);
  }, [pathname]);

  const go = (href: string, label?: string) => {
    if (label) {
      pushRecentModule({ href, label });
      setRecents(getRecentModules());
    }
    startTransition(() => {
      router.push(href);
    });
    onNavigate?.();
  };

  const toggleUniverse = (id: string) => {
    setOpenUniverseId((current) => {
      const next = current === id ? null : id;
      if (next === null && id === activeUniverseId) {
        userClosedActiveUniverse.current = true;
      } else if (next) {
        userClosedActiveUniverse.current = false;
        try { localStorage.setItem(SIDEBAR_UNIVERSE_KEY, next); } catch { /* ignore */ }
      }
      return next;
    });
  };

  const refreshFavorites = () => setFavorites(getFavoriteModules());

  const initials = (session?.user?.name ?? 'OR')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isMini = mini && variant === 'desktop' && !compact;
  const sidebarWidth = isMini ? SIDEBAR_WIDTH_MINI : SIDEBAR_WIDTH_EXPANDED;

  return (
    <aside
      className={`orion-sidebar orion-sidebar-v2 flex flex-col shrink-0 ${
        isMini ? 'orion-sidebar-mini p-2 gap-2' : 'p-3 gap-2.5'
      } ${
        variant === 'desktop'
          ? 'hidden xl:flex fixed top-0 left-0 h-screen z-40'
          : 'w-full h-full p-3 gap-2.5'
      }`}
      style={{ width: variant === 'desktop' ? sidebarWidth : undefined }}
      aria-label="Navigation principale"
    >
      {/* Zone A — Header workspace */}
      <div className={`orion-sb-brand shrink-0 flex flex-col relative ${isMini ? 'h-auto py-2 px-1 gap-1.5' : 'h-14 px-3 flex-row items-center justify-between'}`}>
        <Link
          href={profile.homeRoute}
          className={`flex items-center ${isMini ? 'justify-center w-full' : 'gap-2.5 min-w-0'}`}
          onClick={onNavigate}
          title="ANS ORION"
        >
          {isMini || compact ? (
            // eslint-disable-next-line @next/next/no-img-element -- marque statique sidebar mini
            <img
              src="/branding/ans-logo-mark-rounded.png"
              alt=""
              width={52}
              height={52}
              decoding="async"
              className="orion-sb-mini-logo orion-ans-monogram object-contain"
              data-brand="ans.com"
            />
          ) : (
            <OrionLogo size="sm" showSubtitle />
          )}
        </Link>
        {!isMini && !compact && variant === 'desktop' && (
          <button
            type="button"
            onClick={() => setMini(true)}
            className="orion-sb-collapse-btn shrink-0"
            title="Réduire la sidebar"
            aria-label="Réduire la sidebar"
          >
            <PanelLeftClose size={14} />
          </button>
        )}
        {isMini && variant === 'desktop' && (
          <button
            type="button"
            onClick={() => setMini(false)}
            className="orion-sb-collapse-btn mx-auto"
            title="Étendre la sidebar"
            aria-label="Étendre la sidebar"
          >
            <PanelLeftOpen size={14} />
          </button>
        )}
      </div>

      {/* Zone B — Recherche / command palette */}
      {!compact && !isMini && (
        <div className="orion-sb-widget orion-sb-search-panel p-2.5 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-detail font-bold text-[var(--text-secondary)] tracking-wider uppercase truncate">
              {profile.label}
            </span>
            <span className="orion-sb-env-badge shrink-0">
              ANS DESIGN
            </span>
          </div>
          <button
            type="button"
            onClick={openCommandPalette}
            className="orion-sb-search-trigger w-full"
            aria-label="Rechercher un module (Ctrl+K)"
          >
            <Search size={15} strokeWidth={1.75} className="text-[var(--text-muted)] shrink-0" />
            <span className="flex-1 text-left truncate">Rechercher un module…</span>
            <kbd className="orion-sb-kbd">⌘K</kbd>
          </button>
        </div>
      )}

      {isMini && (
        <button
          type="button"
          onClick={openCommandPalette}
          className="orion-sb-universe-mini mx-auto"
          title="Rechercher (⌘K)"
          aria-label="Rechercher un module"
        >
          <Search size={18} strokeWidth={1.75} />
        </button>
      )}

      {/* Zone C — Accès rapides + Univers */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden pr-0.5 orion-sb-nav min-h-0">
        {!compact && !isMini && (
          <SidebarQuickAccess
            favorites={favorites}
            recents={recents}
            pathname={pathname}
            locationSearch={locationSearch}
            isActive={isNavItemActive}
            onNavigate={go}
            activeTab={quickTab}
            onTabChange={setQuickTab}
          />
        )}

        {!isMini && !compact && (favorites.length > 0 || recents.length > 0) && (
          <div className="orion-sb-div my-2" />
        )}

        <SidebarUniverseNav
          universes={universes}
          openUniverseId={openUniverseId}
          pathname={pathname}
          locationSearch={locationSearch}
          badges={badges}
          mini={isMini}
          flyoutUniverseId={flyoutUniverseId}
          isActive={isNavItemActive}
          onToggleUniverse={toggleUniverse}
          onNavigate={go}
          onFavoritesChange={refreshFavorites}
          onFlyoutUniverse={setFlyoutUniverseId}
        />
      </nav>

      {/* Zone D — Compte (Mon compte / Apparence / Déconnexion) — pas de doublon header */}
      <div className={`orion-sb-widget relative shrink-0 border border-[var(--border-soft)] ${isMini ? 'p-2' : 'p-2.5'}`}>
        {userMenuOpen && !isMini && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} aria-hidden />
            <div className="absolute left-0 right-0 bottom-full mb-1 z-50 rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] p-1">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  go('/parametres');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-[7px] hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
              >
                <Settings size={14} aria-hidden /> Mon compte
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  go('/parametres/apparence');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-[7px] hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
              >
                <Palette size={14} aria-hidden /> Apparence
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-[7px] hover:bg-[var(--bg-hover)] text-[var(--accent-primary,#ff174d)]"
              >
                <LogOut size={14} aria-hidden /> Déconnexion
              </button>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            if (isMini) {
              go('/parametres');
              return;
            }
            setUserMenuOpen((o) => !o);
          }}
          className={`w-full flex items-center ${isMini ? 'justify-center' : 'justify-between gap-2'} rounded-[7px] hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500`}
          title={isMini ? 'Mon compte' : undefined}
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
        >
          <div className={`flex items-center ${isMini ? '' : 'gap-2 min-w-0'}`}>
            <div className="relative w-8 h-8 rounded-lg ans-btn-primary flex items-center justify-center font-bold text-xs text-white shrink-0">
              {initials}
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[var(--cockpit-surface)]" />
            </div>
            {!isMini && !compact && (
              <div className="text-left min-w-0">
                <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight truncate">
                  {session?.user?.name ?? 'Utilisateur'}
                </p>
                <p className="text-[9px] text-[var(--text-muted)] truncate">{profile.label}</p>
              </div>
            )}
          </div>
          {!isMini && (
            <ChevronUp
              size={14}
              className={`text-[var(--text-secondary)] shrink-0 transition-transform ${userMenuOpen ? '' : 'rotate-180'}`}
              aria-hidden
            />
          )}
        </button>
        {isMini && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-1.5 w-full flex justify-center p-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] bg-[var(--orion-surface-soft)] hover:bg-[var(--orion-surface-hover)] rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            title="Déconnexion"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}

export function OrionSidebarDrawer({ role, onClose }: { role: string; onClose: () => void }) {
  return <OrionSidebar role={role} variant="drawer" onNavigate={onClose} />;
}
