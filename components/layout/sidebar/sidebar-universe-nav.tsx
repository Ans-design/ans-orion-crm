'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import type { SidebarUniverseNav } from '@/lib/navigation/build-sidebar-universes';
import type { BuiltNavItem } from '@/lib/modules';
import { COMMERCIAL_FLOW_STEPS, MODULE_BADGE_KEYS } from '@/lib/navigation/sidebar-universes';
import { isFavoriteModule, toggleFavoriteModule } from '@/lib/nav/favorite-modules';
import type { NavBadgeCounts } from '@/lib/navigation/nav-badges-shared';
import { pickBadgeCount, sumUniverseBadge, EMPTY_NAV_BADGES } from '@/lib/navigation/nav-badges-shared';
import { isGroupActive, isItemActive } from '@/lib/navigation/sidebar-active';
import { SidebarBadge } from '@/components/layout/sidebar/sidebar-badge';
import { SidebarMiniFlyout } from '@/components/layout/sidebar/sidebar-mini-flyout';
import { AdministrationMacroNav } from '@/components/administration/AdministrationMacroNav';
import { useAdminMacroBadgeCounts } from '@/lib/hooks/use-admin-macro-badge-counts';
import {
  ADMIN_MACRO_MODULES,
  sumAuthorizedAdminMacroBadges,
} from '@/lib/administration/admin-macro-modules';
import { useCommercialJourney } from '@/lib/commercial/use-commercial-journey';
import { useCommandeOpsJourney } from '@/lib/commande/use-commande-ops-journey';
import { isCommandeHubUniverse } from '@/lib/commande/commande-universe-flow';
import { resolveSidebarModuleHrefForCommande } from '@/lib/gpao/gpao-module-links';
import { CommandeFlowPreview } from '@/components/layout/sidebar/commande-flow-preview';

type Props = {
  universes: SidebarUniverseNav[];
  openUniverseId: string | null;
  pathname: string;
  locationSearch: string;
  badges?: NavBadgeCounts;
  mini?: boolean;
  flyoutUniverseId?: string | null;
  isActive: (pathname: string, href: string, search: string) => boolean;
  onToggleUniverse: (id: string) => void;
  onNavigate: (href: string, label?: string) => void;
  onFavoritesChange?: () => void;
  onFlyoutUniverse?: (id: string | null) => void;
};

type FlyoutAnchor = { top: number; left: number };

function SubModuleRow({
  item,
  step,
  stepTotal,
  active,
  showFlow,
  flowCurrent,
  flowDone,
  badgeCount,
  onNavigate,
  onFavoritesChange,
}: {
  item: BuiltNavItem;
  step?: number;
  stepTotal?: number;
  active: boolean;
  showFlow: boolean;
  flowCurrent?: boolean;
  flowDone?: boolean;
  badgeCount: number;
  onNavigate: (href: string, label?: string) => void;
  onFavoritesChange?: () => void;
}) {
  const Icon = item.icon;
  const fav = isFavoriteModule(item.href);
  const rowClass = [
    'orion-sb-sub-row group',
    active ? 'is-active' : '',
    showFlow && flowCurrent ? 'is-current' : '',
    showFlow && flowDone && !flowCurrent ? 'is-done' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rowClass}>
      {showFlow && step != null && stepTotal != null && stepTotal > 0 && (
        <span
          className={`orion-sb-flow-step ${flowCurrent ? 'is-current' : ''} ${flowDone ? 'is-done' : ''}`}
          title={
            flowCurrent
              ? `Étape en cours — ${step} sur ${stepTotal}`
              : flowDone
                ? `Étape terminée — ${step} sur ${stepTotal}`
                : `Étape ${step} sur ${stepTotal}`
          }
          aria-label={`Étape ${step} sur ${stepTotal}`}
        >
          {step}
        </span>
      )}
      <button
        type="button"
        onClick={() => onNavigate(item.href, item.label)}
        className="orion-sb-sub-link"
        aria-current={active || flowCurrent ? 'page' : undefined}
      >
        {Icon ? (
          <Icon size={14} strokeWidth={1.75} className="orion-sb-sub-icon" aria-hidden />
        ) : (
          <span className="orion-sb-sub-icon-placeholder" aria-hidden />
        )}
        <span className="orion-sb-sub-label truncate">{item.label}</span>
        <SidebarBadge count={badgeCount} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          toggleFavoriteModule(item);
          onFavoritesChange?.();
        }}
        className={`orion-sb-fav-btn ${fav ? 'is-fav' : ''}`}
        title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Star size={10} fill={fav ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

function UniverseSubList({
  universe,
  pathname,
  locationSearch,
  badges,
  isActive,
  onNavigate,
  onFavoritesChange,
  opsDeepLink,
  opsCommandeLabel,
  opsCommandeId,
}: {
  universe: SidebarUniverseNav;
  pathname: string;
  locationSearch: string;
  badges?: NavBadgeCounts;
  isActive: (pathname: string, href: string, search: string) => boolean;
  onNavigate: (href: string, label?: string) => void;
  onFavoritesChange?: () => void;
  opsDeepLink?: string;
  opsCommandeLabel?: string | null;
  opsCommandeId?: string | null;
}) {
  /** Numérotation visuelle uniquement sur le parcours Commercial 1→N. */
  const showCommercialSteps = universe.id === 'commercial';
  const { isCurrent, isDone } = useCommercialJourney();
  const visibleFlowIds = showCommercialSteps
    ? universe.items.filter((i) => COMMERCIAL_FLOW_STEPS.has(i.id)).map((i) => i.id)
    : [];
  const stepTotal = visibleFlowIds.length;

  return (
    <div className={`orion-sb-sublist ${showCommercialSteps ? 'orion-sb-sublist--flow' : ''}`}>
      {universe.flowLabel && (
        <p className="orion-sb-flow-label">{universe.flowLabel}</p>
      )}
      {opsDeepLink && (
        <button
          type="button"
          className="orion-sb-ops-deeplink"
          onClick={() => onNavigate(opsDeepLink, universe.label)}
        >
          Continuer {opsCommandeLabel ? `· ${opsCommandeLabel}` : 'la commande'}
        </button>
      )}
      <div className={`space-y-0.5 ${showCommercialSteps ? 'orion-sb-flow-list' : ''}`}>
        {universe.items.map((item) => {
          const flowIndex = visibleFlowIds.indexOf(item.id);
          const step = showCommercialSteps && flowIndex >= 0 ? flowIndex + 1 : undefined;
          const inFlow = showCommercialSteps && flowIndex >= 0;
          const href = resolveSidebarModuleHrefForCommande(
            item.id,
            item.href,
            isCommandeHubUniverse(universe.id) ? opsCommandeId : null,
          );
          const linkedItem = href === item.href ? item : { ...item, href };
          return (
            <div key={item.id} className="orion-sb-flow-item">
              <SubModuleRow
                item={linkedItem}
                step={step}
                stepTotal={stepTotal}
                active={isActive(pathname, linkedItem.href, locationSearch)}
                showFlow={showCommercialSteps}
                flowCurrent={inFlow ? isCurrent(item.id) : false}
                flowDone={inFlow ? isDone(item.id) : false}
                badgeCount={pickBadgeCount(badges ?? EMPTY_NAV_BADGES, MODULE_BADGE_KEYS[item.id])}
                onNavigate={onNavigate}
                onFavoritesChange={onFavoritesChange}
              />
              {showCommercialSteps && item.id === 'commandes' ? (
                <CommandeFlowPreview onNavigate={onNavigate} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SidebarUniverseNav({
  universes,
  openUniverseId,
  pathname,
  locationSearch,
  badges,
  mini,
  flyoutUniverseId,
  isActive,
  onToggleUniverse,
  onNavigate,
  onFavoritesChange,
  onFlyoutUniverse,
}: Props) {
  const [flyoutAnchor, setFlyoutAnchor] = useState<FlyoutAnchor | null>(null);
  const {
    snapshot: opsJourney,
    isUniverseCurrent,
    isUniverseDone,
    steps: opsSteps,
  } = useCommandeOpsJourney();

  useEffect(() => {
    if (!flyoutUniverseId) setFlyoutAnchor(null);
  }, [flyoutUniverseId]);

  const openFlyout = (universeId: string, anchor: FlyoutAnchor) => {
    setFlyoutAnchor(anchor);
    onFlyoutUniverse?.(universeId);
  };

  const closeFlyout = () => {
    setFlyoutAnchor(null);
    onFlyoutUniverse?.(null);
  };

  const flyoutUniverse = flyoutUniverseId
    ? universes.find((u) => u.id === flyoutUniverseId)
    : undefined;

  /** Fetch badges Admin seulement si l’univers Admin est ouvert ou qu’on y est. */
  const adminBadgesEnabled =
    universes.some((u) => u.adminNav)
    && (openUniverseId === 'administration'
      || pathname.startsWith('/administration')
      || pathname.startsWith('/admin'));
  const adminMacroBadges = useAdminMacroBadgeCounts(adminBadgesEnabled);

  return (
    <>
      <div className="space-y-1">
        {universes.map((universe) => {
          const Icon = universe.icon;
          const isOpen = openUniverseId === universe.id;
          const hasActive = isGroupActive(universe, pathname, locationSearch);
          const showFlyout = mini && flyoutUniverseId === universe.id;
          const opsTracked = isCommandeHubUniverse(universe.id);
          const opsCurrent = opsTracked && isUniverseCurrent(universe.id);
          const opsDone = opsTracked && isUniverseDone(universe.id);
          const opsStepHref = opsTracked
            ? opsSteps.find((s) => s.id === universe.id)?.href
            : undefined;
          const universeBadge = universe.adminNav
            ? sumAuthorizedAdminMacroBadges(adminMacroBadges, ADMIN_MACRO_MODULES)
            : sumUniverseBadge(
                badges ?? EMPTY_NAV_BADGES,
                universe.items.map((i) => i.id),
                MODULE_BADGE_KEYS,
              );
          const singleItem = universe.items.length === 1 ? universe.items[0] : null;
          const opsTitle =
            opsJourney.commandeId && (opsCurrent || opsDone)
              ? `${universe.label} — ${opsJourney.numero ?? 'commande'} (${opsCurrent ? 'en cours' : 'fait'})`
              : universe.label;

          if (mini) {
            const miniActive = singleItem
              ? isItemActive(pathname, singleItem, locationSearch)
              : hasActive;

            return (
              <div key={universe.id} className="relative flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    if (singleItem) {
                      onNavigate(
                        opsCurrent && opsStepHref ? opsStepHref : singleItem.href,
                        singleItem.label,
                      );
                      return;
                    }
                    if (showFlyout) {
                      closeFlyout();
                      return;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    openFlyout(universe.id, { top: rect.top, left: rect.right + 8 });
                  }}
                  className={[
                    'orion-sb-universe-mini',
                    miniActive ? 'orion-sb-universe-mini-active' : '',
                    opsCurrent ? 'is-current' : '',
                    opsDone && !opsCurrent ? 'is-done' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  title={opsTitle}
                  aria-label={opsTitle}
                  aria-expanded={singleItem ? undefined : showFlyout}
                  aria-haspopup={singleItem ? undefined : 'dialog'}
                >
                  <Icon size={20} strokeWidth={1.7} aria-hidden />
                  {universeBadge > 0 && (
                    <span className="orion-sb-universe-mini-badge" aria-label={`${universeBadge} alertes`}>
                      {universeBadge > 9 ? '9+' : universeBadge}
                    </span>
                  )}
                </button>
              </div>
            );
          }

          /* Ouvert = bandeau rouge plein (réf. Pilotage screenshot) */
          return (
            <div
              key={universe.id}
              className={[
                'orion-sb-universe-group',
                opsCurrent ? 'is-ops-current' : '',
                opsDone && !opsCurrent ? 'is-ops-done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                onClick={() => onToggleUniverse(universe.id)}
                className={[
                  'orion-sb-universe-btn',
                  isOpen ? 'orion-sb-universe-btn-open orion-sb-universe-btn-active' : '',
                  hasActive && !isOpen ? 'orion-sb-universe-btn-has-active' : '',
                  opsCurrent ? 'is-current' : '',
                  opsDone && !opsCurrent ? 'is-done' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-expanded={isOpen}
                aria-current={hasActive && isOpen ? 'true' : opsCurrent ? 'step' : undefined}
                title={opsTitle}
              >
                <span className="orion-sb-universe-icon">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="truncate flex-1 text-left">{universe.label}</span>
                <SidebarBadge count={universeBadge} variant="universe" />
                {(hasActive || opsCurrent) && !isOpen && (
                  <span
                    className={`orion-sb-universe-active-dot ${opsCurrent ? 'is-ops' : ''}`}
                    aria-hidden
                  />
                )}
                <ChevronRight
                  size={12}
                  className={`orion-sb-universe-chevron shrink-0 transition-transform ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                  aria-hidden
                />
              </button>

              {isOpen && (
                universe.adminNav ? (
                  <AdministrationMacroNav
                    pathname={pathname}
                    locationSearch={locationSearch}
                    badgeCounts={adminMacroBadges}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <UniverseSubList
                    universe={universe}
                    pathname={pathname}
                    locationSearch={locationSearch}
                    badges={badges}
                    isActive={isActive}
                    onNavigate={onNavigate}
                    onFavoritesChange={onFavoritesChange}
                    opsDeepLink={opsCurrent ? opsStepHref : undefined}
                    opsCommandeLabel={opsJourney.numero}
                    opsCommandeId={opsJourney.commandeId}
                  />
                )
              )}
            </div>
          );
        })}
      </div>

      {mini && flyoutUniverse && flyoutAnchor && (
        <SidebarMiniFlyout
          universe={flyoutUniverse}
          anchor={flyoutAnchor}
          pathname={pathname}
          locationSearch={locationSearch}
          onClose={closeFlyout}
        >
          {flyoutUniverse.adminNav ? (
            <AdministrationMacroNav
              pathname={pathname}
              locationSearch={locationSearch}
              badgeCounts={adminMacroBadges}
              onNavigate={(href, label) => {
                onNavigate(href, label);
                closeFlyout();
              }}
            />
          ) : (
            <UniverseSubList
              universe={flyoutUniverse}
              pathname={pathname}
              locationSearch={locationSearch}
              badges={badges}
              isActive={isActive}
              onNavigate={(href, label) => {
                onNavigate(href, label);
                closeFlyout();
              }}
              onFavoritesChange={onFavoritesChange}
              opsDeepLink={
                isCommandeHubUniverse(flyoutUniverse.id)
                && isUniverseCurrent(flyoutUniverse.id)
                  ? opsSteps.find((s) => s.id === flyoutUniverse.id)?.href
                  : undefined
              }
              opsCommandeLabel={opsJourney.numero}
              opsCommandeId={opsJourney.commandeId}
            />
          )}
        </SidebarMiniFlyout>
      )}
    </>
  );
}
