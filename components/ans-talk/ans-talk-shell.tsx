'use client';

import type { ReactNode } from 'react';

type Props = {
  demoMode?: boolean;
  children: ReactNode;
  className?: string;
};

/** Shell plein écran — le branding est dans le rail gauche (refonte moderne). */
export function AnsTalkShell({ demoMode, children, className = '' }: Props) {
  return (
    <div className={`ans-talk-shell flex flex-col h-full min-h-0 w-full ${className}`}>
      {demoMode && (
        <div className="sr-only" aria-live="polite">Mode démonstration ANS Talk</div>
      )}
      <div className="flex flex-1 min-h-0 relative">{children}</div>
    </div>
  );
}
