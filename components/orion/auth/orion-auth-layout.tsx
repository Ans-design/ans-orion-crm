'use client';

import type { ReactNode } from 'react';
import { OrionAuthBackground } from './orion-auth-background';

/** Layout split login — branding gauche (desktop), formulaire droite / centré mobile. */
export function OrionAuthLayout({
  brand,
  form,
  footer,
}: {
  brand: ReactNode;
  form: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <OrionAuthBackground>
      <div className="orion-auth-layout flex flex-1 flex-col lg:flex-row lg:items-stretch">
        <aside className="orion-auth-brand hidden lg:flex lg:w-[46%] xl:w-[48%] flex-col justify-between p-10 xl:p-14">
          {brand}
        </aside>
        <div className="orion-auth-form-wrap flex flex-1 flex-col items-center justify-center p-4 sm:p-8 lg:p-10">
          <div className="orion-auth-brand-compact mb-6 text-center lg:hidden w-full max-w-md [&_.orion-logo-extended]:hidden">
            {brand}
          </div>
          <div className="w-full max-w-md">{form}</div>
          {footer ? <div className="mt-6 w-full max-w-md">{footer}</div> : null}
        </div>
      </div>
    </OrionAuthBackground>
  );
}
