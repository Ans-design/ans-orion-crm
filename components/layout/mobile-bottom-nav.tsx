'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Home,
  Briefcase,
  ShoppingCart,
  Zap,
  MessageSquare,
  LayoutGrid,
} from 'lucide-react';
import { buildMobileBottomNav, shouldHideMobileBottomNav } from '@/lib/responsive/mobile-nav';
import { ORION_MOBILE_BOTTOM_NAV_PX } from '@/lib/responsive/shell-metrics';
import { isNavItemActive } from '@/lib/nav-active';
import { SHELL_CLASS } from '@/lib/responsive/breakpoints';
import { useNavBadges } from '@/lib/navigation/use-nav-badges';
import { useBottomActionStackOptional } from '@/components/responsive/bottom-action-stack';
import { useFocusTrap } from '@/lib/responsive/use-focus-trap';
import { useEffectiveModuleAccess } from '@/lib/hooks/use-effective-module-access';
import { MobileNavLauncher } from '@/components/layout/mobile-nav-launcher';
import { pushRecentModule } from '@/lib/nav/recent-modules';

type Props = { role: string };

const SLOT_ICONS = {
  home: Home,
  work: Briefcase,
  action: Zap,
  talk: MessageSquare,
} as const;

/**
 * Bottom nav smartphone — 5 zones toujours cliquables :
 * Accueil · Espace · POS · Talk · Apps
 */
export function MobileBottomNav({ role }: Props) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const moduleAccess = useEffectiveModuleAccess(role);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreSheetRef = useRef<HTMLDivElement>(null);
  const { badges } = useNavBadges();
  const stack = useBottomActionStackOptional();
  const setLayerHeight = stack?.setLayerHeight;

  const closeMore = useCallback(() => setMoreOpen(false), []);
  useFocusTrap(moreOpen, moreSheetRef, closeMore);

  const hide = shouldHideMobileBottomNav(pathname);

  useEffect(() => {
    if (!setLayerHeight) return;
    /* Hauteur stack uniquement quand la tab bar est réellement visible (phone) */
    const mq = window.matchMedia('(max-width: 767.98px)');
    const apply = () => {
      setLayerHeight(
        'mobileNav',
        !hide && mq.matches ? ORION_MOBILE_BOTTOM_NAV_PX : 0,
      );
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      setLayerHeight('mobileNav', 0);
    };
  }, [hide, setLayerHeight]);

  /* Escape ferme Apps */
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMore();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen, closeMore]);

  /* Bloque scroll body quand Apps ouvert */
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  const { slots } = useMemo(
    () => buildMobileBottomNav(role, moduleAccess),
    [role, moduleAccess],
  );

  const go = useCallback(
    (href: string, label: string) => {
      if (!href) return;
      pushRecentModule({ href, label });
      closeMore();
      router.push(href);
    },
    [router, closeMore],
  );

  if (hide) return null;

  const talkUnread = badges?.ansTalk ?? 0;
  const bottomOffset = stack?.offsetAbove('mobileNav') ?? 0;

  return (
    <>
      <nav
        className={`${SHELL_CLASS.phoneBottomNav} orion-phone-tabbar fixed inset-x-0 z-[60]`}
        style={{ bottom: bottomOffset }}
        aria-label="Navigation principale mobile"
        data-orion-mobile-nav
      >
        <ul className="orion-phone-tabbar__grid">
          {slots.map((slot) => {
            const isPos =
              slot.id === 'action' &&
              (slot.label === 'POS' ||
                slot.href === '/pos' ||
                slot.href.startsWith('/pos/'));
            const Icon = isPos
              ? ShoppingCart
              : (SLOT_ICONS[slot.id] ?? Briefcase);
            const active = isNavItemActive(pathname, slot.href);
            const showBadge = slot.id === 'talk' && Number(talkUnread) > 0;
            const fullTitle = slot.title || slot.label;

            return (
              <li key={`${slot.id}-${slot.href}`} className="orion-phone-tabbar__cell">
                <Link
                  href={slot.href}
                  prefetch
                  title={fullTitle}
                  aria-label={fullTitle}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => pushRecentModule({ href: slot.href, label: fullTitle })}
                  className={`orion-phone-tab relative flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 ${
                    isPos ? 'orion-phone-tab--cta' : ''
                  } ${active ? 'is-active text-[var(--primary,#FF174D)]' : 'text-[var(--text-muted)]'}`}
                >
                  {!isPos && active && (
                    <span
                      className="absolute top-0 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-b-[3px] bg-[var(--primary,#FF174D)]"
                      aria-hidden
                    />
                  )}
                  {isPos ? (
                    <span className="orion-phone-tab-cta-disc" aria-hidden>
                      <Icon size={20} strokeWidth={2.1} />
                    </span>
                  ) : (
                    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                      <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                      {showBadge ? (
                        <span className="orion-phone-tab-badge">
                          {Number(talkUnread) > 9 ? '9+' : talkUnread}
                        </span>
                      ) : null}
                    </span>
                  )}
                  <span className="orion-phone-tab-label">{slot.label}</span>
                </Link>
              </li>
            );
          })}

          <li className="orion-phone-tabbar__cell">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              title="Tous les modules"
              className={`orion-phone-tab relative flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 ${
                moreOpen ? 'is-active text-[var(--primary,#FF174D)]' : 'text-[var(--text-muted)]'
              }`}
              aria-label="Tous les modules"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              data-orion-apps-tab
            >
              {moreOpen && (
                <span
                  className="absolute top-0 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-b-[3px] bg-[var(--primary,#FF174D)]"
                  aria-hidden
                />
              )}
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                <LayoutGrid size={20} strokeWidth={moreOpen ? 2.25 : 1.75} aria-hidden />
              </span>
              <span className="orion-phone-tab-label">Apps</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div
          ref={moreSheetRef}
          className="fixed inset-0 z-[70] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Tous les modules"
          data-orion-more-sheet
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Fermer le lanceur"
            tabIndex={-1}
            onClick={closeMore}
          />
          <div
            className="absolute inset-0 overflow-hidden bg-[var(--bg-app,#F4F7FB)]"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <MobileNavLauncher
              role={role}
              onClose={closeMore}
              onNavigate={(href, label) => go(href, label || href)}
            />
          </div>
        </div>
      )}
    </>
  );
}
