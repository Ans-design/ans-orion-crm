'use client';



import { Rocket, RefreshCw, Command } from 'lucide-react';

import { moduleById, moduleForTab, tabLabel } from '@/lib/backoffice/admin-modules';

import type { AdminBackofficeModuleId } from '@/lib/backoffice/admin-modules';

import type { AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';

import type { AdminMacroModule, AdminMicroItem } from '@/lib/administration/admin-macro-modules';

import { macroHubUrl } from '@/lib/administration/admin-macro-modules';
import { AppButton } from '@/components/ui/app-ui';

import { AdminBreadcrumb } from './ui/AdminBreadcrumb';

import { AdminMicroContextDropdown } from './ui/AdminMicroContextDropdown';



type Props = {

  activeTab: AdminBackofficeTabId;

  activeModuleId?: AdminBackofficeModuleId | null;

  macro: AdminMacroModule;

  activeMicro?: AdminMicroItem | null;

  hubMode?: boolean;

  engineVersion?: string;

  lastSync?: string | null;

  canEdit: boolean;

  publishing: boolean;

  syncing: boolean;

  onPublish: () => void;

  onSync: () => void;

  onOpenCommandPalette: () => void;

  statusBadges?: { label: string; tone: 'warn' | 'danger' | 'muted' }[];

};



export function AdminBackofficeTopbar({

  activeTab,

  activeModuleId,

  macro,

  activeMicro,

  hubMode = false,

  engineVersion = 'dynamic-v4',

  lastSync,

  canEdit,

  publishing,

  syncing,

  onPublish,

  onSync,

  onOpenCommandPalette,

  statusBadges = [],

}: Props) {

  const moduleDef = activeModuleId ? moduleById(activeModuleId) : moduleForTab(activeTab);



  const lastSyncLabel = lastSync

    ? new Date(lastSync).toLocaleString('fr-FR', {

        day: '2-digit',

        month: 'short',

        hour: '2-digit',

        minute: '2-digit',

      })

    : null;



  const breadcrumbItems = [

    { label: 'Administration', href: '/administration/vue-ensemble' },

    { label: macro.label, href: macroHubUrl(macro.id) },

    ...(hubMode

      ? []

      : activeMicro

        ? [{ label: activeMicro.label }]

        : [{ label: tabLabel(activeTab) }]),

  ];



  const title = hubMode ? macro.label : (activeMicro?.label ?? moduleDef.label);

  const description = hubMode ? macro.description : (activeMicro?.description ?? moduleDef.description);



  return (

    <header className="ab2-topbar orion-admin-topbar">

      <div className="ab2-topbar-main">

        <AdminBreadcrumb items={breadcrumbItems} />

        {!hubMode && activeMicro && (

          <div className="orion-admin-topbar-context">

            <AdminMicroContextDropdown macro={macro} activeMicro={activeMicro} />

          </div>

        )}

        <h1 className="ab2-topbar-title">{title}</h1>

        <p className="ab2-topbar-desc">{description}</p>

        <div className="ab2-topbar-badges">

          {statusBadges.map((b) => (

            <span key={b.label} className={`ab2-topbar-badge is-${b.tone}`}>{b.label}</span>

          ))}

          <span className="ab2-topbar-meta">

            Moteur {engineVersion}

            {lastSyncLabel && <> · Actif {lastSyncLabel}</>}

          </span>

        </div>

      </div>



      <div className="ab2-topbar-actions">

        <AppButton type="button" variant="ghost" onClick={onOpenCommandPalette} title="Ctrl+K">

          <Command className="h-3.5 w-3.5" />

          Commande

        </AppButton>

        {canEdit && (

          <>

            <AppButton type="button" variant="outline" onClick={onSync} disabled={syncing}>

              <RefreshCw className={`h-3.5 w-3.5${syncing ? ' animate-spin' : ''}`} />

              {syncing ? 'Sync…' : 'Sync POS'}

            </AppButton>

            <AppButton type="button" variant="default" onClick={onPublish} disabled={publishing}>

              <Rocket className="h-3.5 w-3.5" />

              {publishing ? 'Publication…' : 'Publier'}

            </AppButton>

          </>

        )}

      </div>

    </header>

  );

}


