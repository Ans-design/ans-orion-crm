'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';
import { getCartLineCount, setCartUserId } from '@/lib/cart-store';
import { Sun, Moon, Menu, X, Bell } from 'lucide-react';
import { ModuleListSearchProvider } from '@/components/layout/module-list-search-context';
import { CockpitModuleSearch } from '@/components/layout/cockpit-module-search';
import dynamic from 'next/dynamic';
import { LateArrivalGateLazy } from '@/components/auth/late-arrival-gate-lazy';
import { PageRouteGuard } from '@/components/auth/page-route-guard';
import { RoutePageCss } from '@/components/perf/route-page-css';
import { OrionSidebarSuspense, OrionSidebarDrawerSuspense } from '@/components/layout/orion-sidebar-suspense';
import { TabletNavRail } from '@/components/layout/tablet-nav-rail';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { BottomActionStackProvider } from '@/components/responsive/bottom-action-stack';
import { SHELL_CLASS } from '@/lib/responsive/breakpoints';
import { useFocusTrap } from '@/lib/responsive/use-focus-trap';
import { OrionDrawerProvider } from '@/components/orion/orion-drawer-provider';
import { CartDrawerProvider, CartDrawerTrigger } from '@/components/panier/cart-drawer-provider';
import { ModuleDateFilterProvider } from '@/components/layout/module-date-filter-context';
import { OrionLiveFetchBridge } from '@/components/layout/orion-live-fetch-bridge';
import { ModuleDateFilterBar } from '@/components/layout/module-date-filter-bar';
import { resolveRoleProfile } from '@/lib/modules';
import { ThemePrefsLoader } from '@/components/theme-prefs-loader';
import { OrionFieldTabNav } from '@/components/ui/orion-field-tab-nav';
import { persistLocalTheme } from '@/lib/settings-defaults';
import { resolveNotificationHref } from '@/lib/notifications/resolve-href';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { unwrapApiData } from '@/lib/api-client';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';

const CommandPalette = dynamic(() => import('@/components/command-palette').then((m) => m.CommandPalette), {
  ssr: false,
});

const FloatingMessengerRoot = dynamic(
  () => import('@/components/ans-talk/floating-messenger-root').then((m) => m.FloatingMessengerRoot),
  { ssr: false, loading: () => null },
);

const AlertTicker = dynamic(
  () => import('@/components/layout/alert-ticker').then((m) => m.AlertTicker),
  { ssr: false, loading: () => null },
);

const MobileNavLauncher = dynamic(
  () => import('@/components/layout/mobile-nav-launcher').then((m) => m.MobileNavLauncher),
  { ssr: false, loading: () => null },
);

const DATE_FILTER_ROUTES = ['/dashboard', '/operations', '/commandes', '/rapports', '/clients', '/workspace/commercial', '/workspace/production', '/workspace/logistique', '/workspace/studio', '/workspace/finance'];

function showModuleDateFilter(pathname: string) {
  return DATE_FILTER_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession() || {};
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role || 'user';
  const profile = resolveRoleProfile(role);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  useFocusTrap(sidebarOpen, drawerRef, closeSidebar);
  const [cartLineCount, setCartLineCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ id: string; category?: string; icon?: string; title?: string; message?: string; href?: string; link?: string; severity?: string; type?: string; action?: string; entity?: string; entityLabel?: string; details?: string; createdAt: string }[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const appHeaderRef = useRef<HTMLElement>(null);
  const showDateFilter = Boolean(pathname && showModuleDateFilter(pathname));

  const loadNotifs = useCallback(async () => {
    try {
      const drawerR = await fetchWithTimeout('/api/notifications?drawer=1', { timeout: 8_000 });
      if (drawerR.ok) {
        const d = unwrapApiData<{ items?: typeof notifs; unreadCount?: number }>(await drawerR.json());
        if (d.items?.length) {
          setNotifs(d.items);
          setNotifCount(d.unreadCount ?? d.items.length);
          setNotifLoaded(true);
          return;
        }
      }
      const r = await fetchWithTimeout('/api/notifications?unread=true', { timeout: 8_000 });
      if (r.ok) {
        const d = unwrapApiData<{ notifications?: typeof notifs; unreadCount?: number }>(await r.json());
        if (d.notifications?.length) {
          setNotifs(d.notifications);
          setNotifCount(d.unreadCount ?? d.notifications.length);
          setNotifLoaded(true);
          return;
        }
      }
      setNotifs([]);
      setNotifCount(0);
    } catch { /* silencieux */ }
    setNotifLoaded(true);
  }, []);

  const markNotifsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) });
      setNotifCount(0);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSidebarOpen(false);
      setNotifOpen(false);
      window.dispatchEvent(new Event('closeCommandPalette'));
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  useEffect(() => { if (notifOpen && !notifLoaded) loadNotifs(); }, [notifOpen, notifLoaded, loadNotifs]);

  useEffect(() => {
    const onOpenNotif = () => {
      if (typeof window !== 'undefined') {
        (window as Window & { __orionNotifPending?: boolean }).__orionNotifPending = false;
      }
      setNotifOpen(true);
    };
    window.addEventListener('openNotifications', onOpenNotif);
    if ((window as Window & { __orionNotifPending?: boolean }).__orionNotifPending) {
      onOpenNotif();
    }
    return () => window.removeEventListener('openNotifications', onOpenNotif);
  }, []);

  const [talkReady, setTalkReady] = useState(false);
  const [tickerReady, setTickerReady] = useState(false);
  const [paletteReady, setPaletteReady] = useState(false);

  useEffect(() => {
    const mountPalette = () => setPaletteReady(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        (window as Window & { __orionCmdPalettePending?: boolean }).__orionCmdPalettePending = true;
        setPaletteReady(true);
      }
    };
    window.addEventListener('openCommandPalette', mountPalette);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('openCommandPalette', mountPalette);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const enableTalk = () => {
      if (!cancelled) setTalkReady(true);
    };
    const enableTicker = () => {
      if (!cancelled) setTickerReady(true);
    };
    const enablePalette = () => {
      if (!cancelled) setPaletteReady(true);
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleTalk: number | undefined;
    let idleTicker: number | undefined;
    let idlePalette: number | undefined;
    let timeoutTalk: ReturnType<typeof setTimeout> | undefined;
    let timeoutTicker: ReturnType<typeof setTimeout> | undefined;
    let timeoutPalette: ReturnType<typeof setTimeout> | undefined;
    if (typeof w.requestIdleCallback === 'function') {
      idleTalk = w.requestIdleCallback(enableTalk, { timeout: 10_000 });
      idleTicker = w.requestIdleCallback(enableTicker, { timeout: 14_000 });
      idlePalette = w.requestIdleCallback(enablePalette, { timeout: 12_000 });
    } else {
      timeoutTalk = setTimeout(enableTalk, 4000);
      timeoutTicker = setTimeout(enableTicker, 5500);
      timeoutPalette = setTimeout(enablePalette, 5000);
    }
    return () => {
      cancelled = true;
      if (idleTalk != null && typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(idleTalk);
      if (idleTicker != null && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(idleTicker);
      }
      if (idlePalette != null && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(idlePalette);
      }
      if (timeoutTalk) clearTimeout(timeoutTalk);
      if (timeoutTicker) clearTimeout(timeoutTicker);
      if (timeoutPalette) clearTimeout(timeoutPalette);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    const userId = (session?.user as { id?: string })?.id;
    if (userId) setCartUserId(userId);
    const updateCart = () => {
      setCartLineCount(getCartLineCount());
    };
    updateCart();
    window.addEventListener('storage', updateCart);
    window.addEventListener('cartUpdated', updateCart);
    return () => {
      window.removeEventListener('storage', updateCart);
      window.removeEventListener('cartUpdated', updateCart);
    };
  }, [session?.user]);

  /* Spacer = hauteur réelle du header (filtre période inclus / wrap). */
  useEffect(() => {
    const el = appHeaderRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty('--orion-app-header-offset', `${h}px`);
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--orion-app-header-offset');
    };
  }, [showDateFilter, pathname]);

  return (
    <ModuleDateFilterProvider>
    <ModuleListSearchProvider>
    <OrionLiveFetchBridge />
    <OrionDrawerProvider>
    <CartDrawerProvider>
    <BottomActionStackProvider
      initial={{
        mobileNav: 0,
      }}
    >
    <LateArrivalGateLazy>
    <RoutePageCss />
    <ThemePrefsLoader />
    <OrionFieldTabNav />
    <div className="min-h-[100dvh] flex bg-[var(--bg-app)] text-[var(--text-main)]">
      <PageRouteGuard />
      <OrionSidebarSuspense role={role} />
      <TabletNavRail role={role} />

      <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${SHELL_CLASS.contentOffset} transition-[margin] duration-200`}>
        <header ref={appHeaderRef} className="orion-app-header orion-app-header--fixed z-50 shrink-0">
          <div className="cmjn-bar" aria-hidden />
          <div className="orion-cockpit-header">
            <div className="orion-cockpit-header__left">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={`${SHELL_CLASS.phoneTabletMenu} orion-header-icon-btn`}
                aria-label="Applications"
                title="Tous les modules"
              >
                <Menu size={18} strokeWidth={2} />
              </button>
              {showDateFilter ? <ModuleDateFilterBar /> : null}
            </div>

            <div className="orion-cockpit-header__tools" role="toolbar" aria-label="Actions rapides">
              <CockpitModuleSearch />

              <span className="orion-live-chip hidden lg:inline-flex" title="ORION live">
                <span className="orion-live-chip__dot" aria-hidden />
                <span>ORION</span>
              </span>

              <div className="orion-header-tool-cluster">
                <CartDrawerTrigger count={cartLineCount} mounted={mounted} />

                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotifOpen((open) => !open);
                    }}
                    className="orion-header-icon-btn relative"
                    aria-label="Notifications"
                    aria-expanded={notifOpen}
                    aria-haspopup="dialog"
                  >
                    <Bell size={17} strokeWidth={2} />
                    {notifCount > 0 && (
                      <span className="orion-header-notif-dot orion-notif-pulse" aria-hidden />
                    )}
                  </button>
                  {notifOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-[55]"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setNotifOpen(false);
                        }}
                        aria-hidden
                      />
                      <div
                        role="dialog"
                        aria-label="Alertes système"
                        data-orion-notif-panel
                        className="absolute right-0 top-full mt-1.5 w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1rem)] bg-[var(--bg-card)] rounded-[7px] border border-[var(--border-soft)] shadow-[var(--shadow-card)] z-[56] overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-[var(--border-soft)] flex justify-between items-center">
                          <span className="orion-text-label text-[var(--text-main)]">Alertes système</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNotifs([]);
                              setNotifCount(0);
                              markNotifsRead();
                            }}
                            className="text-meta text-[var(--accent-primary,#ff174d)] font-semibold hover:underline"
                          >
                            Tout effacer
                          </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifs.length === 0 && notifLoaded && (
                            <div className="p-3 text-meta text-[var(--orion-dim)] text-center">
                              Aucune alerte
                            </div>
                          )}
                          {notifs.map((n) => {
                            const href = resolveNotificationHref(n);
                            const title = n.title || n.entityLabel || n.entity || 'Alerte';
                            const body = n.message || n.details || n.action;
                            const rowClass =
                              'w-full text-left px-3 py-2 text-body border-b border-[var(--ans-border)]/50 last:border-0';
                            if (!href) {
                              return (
                                <div key={n.id} className={`${rowClass} text-[var(--orion-dim)]`}>
                                  <p className="font-medium text-[var(--orion-text-soft)] truncate">{title}</p>
                                  {body && <p className="truncate">{body}</p>}
                                </div>
                              );
                            }
                            return (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => {
                                  router.push(href);
                                  setNotifOpen(false);
                                  markNotifsRead();
                                }}
                                className={`${rowClass} hover:bg-[var(--orion-surface-muted)]/60`}
                              >
                                <p className="font-medium text-[var(--orion-text-soft)] truncate">{title}</p>
                                {body && <p className="text-[var(--orion-dim)] truncate">{body}</p>}
                              </button>
                            );
                          })}
                        </div>
                        <div className="px-3 py-1.5 border-t border-[var(--ans-border)]">
                          <button
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              router.push('/historique');
                            }}
                            className="text-xs text-[var(--orion-red-vivid)] hover:underline w-full text-center py-1"
                          >
                            Voir l&apos;historique
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = theme === 'dark' ? 'light' : 'dark';
                    setTheme(next);
                    persistLocalTheme(next);
                  }}
                  className="orion-header-icon-btn"
                  aria-label="Basculer le thème"
                >
                  {mounted && (theme === 'dark' ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />)}
                </button>
              </div>
            </div>
          </div>
        </header>
        {/* Réserve la hauteur du header fixed pour le flux */}
        <div className="orion-app-header-spacer shrink-0" aria-hidden />

        {/* Pas d’anim fade à chaque re-render enfants — évite clignotement UI */}
        <main
          className="flex-1 min-h-0 w-full max-w-none mx-0 orion-viewport orion-shell-pad"
          style={{
            /* Ticker fixed → réserve via --orion-inset-bottom + filet */
            paddingBottom:
              'calc(var(--orion-inset-bottom, 0px) + env(safe-area-inset-bottom, 0px) + var(--orion-content-ticker-gap, 5mm))',
            scrollPaddingBottom:
              'calc(var(--orion-inset-bottom, 0px) + env(safe-area-inset-bottom, 0px) + var(--orion-content-ticker-gap, 5mm))',
          }}
        >
          <OrionErrorBoundary zone="main">
            {children}
          </OrionErrorBoundary>
          <div
            className="orion-shell-bottom-clearance pointer-events-none shrink-0"
            aria-hidden
            data-orion-bottom-clearance
          />
        </main>
        {/* Ticker fixed (hôte display:contents) — toujours au-dessus du contenu */}
        <div className="orion-alert-ticker-dock" data-orion-ticker-dock>
          {tickerReady ? <AlertTicker /> : null}
        </div>
      </div>

      {/* Phone = bottom-sheet lanceur · Tablette = drawer latéral (une seule dialogue / trap) */}
      {sidebarOpen && (
        <div
          ref={drawerRef}
          className="fixed inset-0 z-50 xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigation"
        >
          <div className="absolute inset-0 bg-backdrop/70 backdrop-blur-[2px]" onClick={closeSidebar} aria-hidden />

          {/* Phone — plein écran (pas de demi-sheet / gros vide en haut) */}
          <div
            className="absolute inset-0 md:hidden overflow-hidden bg-[var(--bg-app,#F4F7FB)]"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <MobileNavLauncher role={role} onClose={closeSidebar} />
          </div>

          {/* Tablette */}
          <div className="absolute left-0 top-0 bottom-0 hidden md:block w-[min(280px,85vw)] shadow-2xl overflow-hidden bg-surface-panel">
            <div className="flex items-center justify-between p-3 bg-surface-page border-b border-[var(--border-soft)]">
              <span className="font-extrabold text-[var(--text-primary)] text-sm">ORION</span>
              <button type="button" onClick={closeSidebar} className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md text-[var(--orion-muted)] hover:bg-[var(--orion-surface-muted)]" aria-label="Fermer">
                <X size={20} />
              </button>
            </div>
            <OrionSidebarDrawerSuspense role={role} onClose={closeSidebar} />
          </div>
        </div>
      )}

      <MobileBottomNav role={role} />

      {paletteReady ? <CommandPalette role={role} /> : null}
      {talkReady ? <FloatingMessengerRoot /> : null}
    </div>
    </LateArrivalGateLazy>
    </BottomActionStackProvider>
    </CartDrawerProvider>
    </OrionDrawerProvider>
    </ModuleListSearchProvider>
    </ModuleDateFilterProvider>
  );
}
