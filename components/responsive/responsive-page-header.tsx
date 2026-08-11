'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Sous-titre long — off par défaut (densité modules). */
  showDescription?: boolean;
  kicker?: string;
};

/** Header page responsive — aligné PageHeader dense. */
export function ResponsivePageHeader({
  title,
  description,
  actions,
  className,
  showDescription = false,
  kicker,
}: Props) {
  return (
    <header
      className={cn(
        'orion-ds-page-header orion-module-header orion-module-header--compact orion-ds-page-header--compact w-full min-w-0 max-w-full',
        className,
      )}
    >
      <div className="orion-module-header__row orion-ds-page-header__row">
        <div className="orion-module-header__meta orion-ds-page-header__meta min-w-0">
          {kicker ? <p className="orion-module-header__kicker">{kicker}</p> : null}
          <div className="orion-module-header__title-line">
            <h1 className="orion-ds-page-title orion-ds-page-title--compact orion-module-header__title min-w-0">
              <span className="orion-ds-page-title__text truncate block">{title}</span>
            </h1>
          </div>
          {showDescription && description ? (
            <p className="orion-ds-page-desc orion-module-header__desc orion-hide-on-phone">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="orion-ds-page-header__actions orion-module-header__actions" data-orion-h-scroll="1">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
