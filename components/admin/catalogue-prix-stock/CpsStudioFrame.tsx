'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title?: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Compact : pas de titre (chrome parent) */
  flush?: boolean;
};

/** Cadre studio unifié — surface table + en-tête métier. */
export function CpsStudioFrame({ title, subtitle, toolbar, children, className, flush }: Props) {
  return (
    <section className={cn('cps-studio-frame', flush && 'cps-studio-frame--flush', className)}>
      {!flush && (title || toolbar) ? (
        <div className="cps-studio-frame__head">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="cps-studio-frame__title">{title}</h2> : null}
            {subtitle ? <p className="cps-studio-frame__subtitle">{subtitle}</p> : null}
          </div>
          {toolbar ? <div className="cps-studio-frame__toolbar">{toolbar}</div> : null}
        </div>
      ) : null}
      <div className="cps-studio-frame__body">{children}</div>
    </section>
  );
}
