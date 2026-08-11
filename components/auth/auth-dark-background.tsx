'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Fond sombre premium ANS ORION — déclaration de retard RH. */
export function AuthDarkBackground({
  children,
  className,
  embedded,
}: {
  children: ReactNode;
  className?: string;
  /** Aperçu dev-preview (pas de position fixed). */
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        'late-arrival-overlay',
        embedded && 'late-arrival-overlay--embedded',
        className,
      )}
    >
      <div className="late-arrival-overlay__glow late-arrival-overlay__glow--blue" aria-hidden />
      <div className="late-arrival-overlay__glow late-arrival-overlay__glow--rose" aria-hidden />
      <div className="late-arrival-overlay__inner">{children}</div>
    </div>
  );
}
