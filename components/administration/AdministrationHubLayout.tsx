'use client';

import type { ReactNode } from 'react';
import type { AdminMacroModule, AdminMicroItem } from '@/lib/administration/admin-macro-modules';
import { macroHubUrl } from '@/lib/administration/admin-macro-modules';
import { AdminBreadcrumb } from '@/components/backoffice-v2/ui/AdminBreadcrumb';
import { AdminMicroContextDropdown } from '@/components/backoffice-v2/ui/AdminMicroContextDropdown';

type Props = {
  macro: AdminMacroModule;
  activeMicro?: AdminMicroItem | null;
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * `flush` : pas de breadcrumb / titre hub — le workspace CPS
   * porte son propre AdminHeader (titre + DOMAINES alignés).
   */
  chrome?: 'default' | 'flush';
};

/**
 * Layout commun Hub & Spoke pour pages legacy Administration (/administration/*, /admin/*).
 * Breadcrumb + dropdown contexte + zone contenu.
 */
export function AdministrationHubLayout({
  macro,
  activeMicro,
  title,
  description,
  toolbar,
  children,
  className,
  chrome = 'default',
}: Props) {
  const pageTitle = title ?? activeMicro?.label ?? macro.label;
  const pageDesc = description ?? activeMicro?.description ?? macro.description;
  const flush = chrome === 'flush';

  return (
    <div
      className={`orion-admin-legacy-layout orion-admin-table-root${flush ? ' orion-admin-legacy-layout--flush' : ''}${className ? ` ${className}` : ''}`}
    >
      {!flush ? (
        <header className="orion-admin-legacy-header">
          <AdminBreadcrumb
            items={[
              { label: 'Administration', href: '/administration/vue-ensemble' },
              { label: macro.label, href: macroHubUrl(macro.id) },
              ...(activeMicro ? [{ label: activeMicro.label }] : []),
            ]}
          />

          {activeMicro && (
            <div className="orion-admin-legacy-context">
              <AdminMicroContextDropdown macro={macro} activeMicro={activeMicro} />
            </div>
          )}

          <h1 className="orion-admin-legacy-title">{pageTitle}</h1>
          <p className="orion-admin-legacy-desc">{pageDesc}</p>

          {toolbar && <div className="orion-admin-legacy-toolbar">{toolbar}</div>}
        </header>
      ) : null}

      <div className="orion-admin-legacy-body">{children}</div>
    </div>
  );
}
