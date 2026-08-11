import type { ReactNode } from 'react';

/** Scope styles pricing-admin (pta-*, acat-*) dans le shell Backoffice v2 — zéro suppression legacy. */
export function BackofficeLegacyScope({ children }: { children: ReactNode }) {
  return <div className="ab2-legacy-scope orion-pricing-admin">{children}</div>;
}
