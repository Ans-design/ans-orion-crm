import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { SyncStateBadge, type SyncUiStatus } from '@/components/ui/sync-state-badge'

/**
 * En-tête module ORION — dense, hiérarchie claire :
 * kicker (petit) · titre (compact 15px) · méta chip · actions.
 * Description masquée en mode compact (défaut) pour éviter le billboard.
 * compact={false} pour afficher le sous-titre long.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
  icon: Icon,
  compact = true,
  syncStatus,
  syncAsOf,
  kicker,
  meta,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  className?: string
  icon?: LucideIcon
  compact?: boolean
  syncStatus?: SyncUiStatus
  syncAsOf?: string | null
  /** Libellé module court, ex. « Catalogue », « Commandes » */
  kicker?: string
  /** Compteur / statut à droite du titre, ex. « 95 art. » */
  meta?: React.ReactNode
}) {
  const mergedActions = (syncStatus || actions) ? (
    <>
      {syncStatus ? <SyncStateBadge status={syncStatus} asOf={syncAsOf} /> : null}
      {actions}
    </>
  ) : null

  return (
    <header
      className={cn(
        'orion-ds-page-header orion-module-header orion-ux-fade-in w-full min-w-0 max-w-full',
        compact ? 'orion-ds-page-header--compact orion-module-header--compact' : '',
        className,
      )}
    >
      {breadcrumb ? <div className="orion-ds-page-header__crumb min-w-0">{breadcrumb}</div> : null}

      <div className="orion-module-header__row orion-ds-page-header__row">
        <div className="orion-module-header__meta orion-ds-page-header__meta min-w-0">
          {kicker ? (
            <p className="orion-module-header__kicker">{kicker}</p>
          ) : null}

          <div className="orion-module-header__title-line">
            <h1
              className={cn(
                'orion-ds-page-title orion-module-header__title flex items-center gap-1.5 min-w-0',
                compact && 'orion-ds-page-title--compact',
              )}
            >
              {Icon ? (
                <Icon
                  size={compact ? 16 : 18}
                  className="text-[var(--brand-primary,#FF174D)] shrink-0 opacity-90"
                  aria-hidden
                />
              ) : null}
              <span className="orion-ds-page-title__text truncate">{title}</span>
            </h1>

            {meta != null && meta !== '' ? (
              <span className="orion-module-header__chip">{meta}</span>
            ) : null}
          </div>

          {/* Compact (défaut) : pas de paragraphe long sous le titre — kicker + h1 + chip suffisent */}
          {description && !compact ? (
            <p className="orion-ds-page-desc orion-module-header__desc orion-hide-on-phone">
              {description}
            </p>
          ) : null}
        </div>

        {mergedActions ? (
          <div className="orion-ds-page-header__actions orion-module-header__actions" data-orion-h-scroll="1">
            {mergedActions}
          </div>
        ) : null}
      </div>
    </header>
  )
}
