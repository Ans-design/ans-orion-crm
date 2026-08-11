'use client';

import type { ReactNode } from 'react';

/** Fond auth premium — gradient bleu nuit, grille et orbes (sans image lourde). */
export function OrionAuthBackground({ children }: { children: ReactNode }) {
  return (
    <div className="orion-auth-bg relative min-h-screen overflow-hidden">
      <div className="orion-auth-bg__grid pointer-events-none" aria-hidden />
      <div className="orion-auth-bg__orb orion-auth-bg__orb--rose pointer-events-none" aria-hidden />
      <div className="orion-auth-bg__orb orion-auth-bg__orb--gold pointer-events-none" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </div>
  );
}
