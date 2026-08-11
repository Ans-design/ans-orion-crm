import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  kicker?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Toolbar compacte — pas de titre H2 (déjà dans la topbar hub). */
  variant?: 'default' | 'toolbar';
  /** Sous-titre long — off par défaut (densité modules). */
  showDescription?: boolean;
  className?: string;
};

/** En-tête backoffice densifié — kicker + titre + chip actions (pas de billboard). */
export function BackofficePageHeader({
  kicker,
  title,
  subtitle,
  actions,
  variant = 'default',
  showDescription = false,
  className,
}: Props) {
  const isToolbar = variant === 'toolbar';

  return (
    <header
      className={cn(
        'ab2-page-header orion-module-header orion-module-header--compact',
        isToolbar && 'is-toolbar',
        className,
      )}
    >
      <div className="orion-module-header__meta min-w-0">
        {kicker ? <p className="ab2-page-kicker orion-module-header__kicker">{kicker}</p> : null}
        {!isToolbar && title ? (
          <div className="orion-module-header__title-line">
            <h2 className="ab2-page-title orion-module-header__title">{title}</h2>
          </div>
        ) : null}
        {showDescription && subtitle ? (
          <p className="ab2-page-subtitle orion-module-header__desc">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="ab2-page-actions orion-module-header__actions">{actions}</div> : null}
    </header>
  );
}
