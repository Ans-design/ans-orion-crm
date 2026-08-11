'use client';

import { Save, Rocket, Download } from 'lucide-react';
import type { PricingAdminTopTabId } from '@/lib/pricing/pricing-admin-ui';
import { PRICING_ADMIN_TOP_TABS } from '@/lib/pricing/pricing-admin-ui';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  activeTab: PricingAdminTopTabId;
  onTabChange: (id: PricingAdminTopTabId) => void;
  children: React.ReactNode;
  anomalyCount?: number;
  onExportJson?: () => void;
  canEdit?: boolean;
  publishedCount?: number;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  saving?: boolean;
  publishing?: boolean;
  description?: string;
  kpiStrip?: React.ReactNode;
};

export function PricingAdminShell({
  activeTab,
  onTabChange,
  children,
  anomalyCount = 0,
  onExportJson,
  canEdit,
  publishedCount,
  onSaveDraft,
  onPublish,
  saving,
  publishing,
  description,
  kpiStrip,
}: Props) {
  return (
    <div className="orion-pricing-admin">
      <nav className="pta-topnav" aria-label="Navigation backoffice">
        <div className="pta-topnav-logo">
          ◆ ANS ORION <span>/ Backoffice</span>
        </div>
        <div className="pta-topnav-tabs" role="tablist">
          {PRICING_ADMIN_TOP_TABS.map((t) => {
            const active = activeTab === t.id;
            const badge = 'badge' in t && t.badge ? anomalyCount : 0;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(t.id)}
                className={`pta-tab-btn${active ? ' active' : ''}`}
              >
                <t.icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0 opacity-90" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(' ')[0]}</span>
                {badge > 0 && (
                  <span className="pta-tab-badge" aria-label={`${badge} anomalies`}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="pta-topnav-actions">
          {canEdit && onSaveDraft && (
            <AppButton type="button" variant="ghost" size="sm" className="inline-flex items-center gap-1.5" onClick={onSaveDraft} disabled={saving}>
              {saving ? '…' : <><Save size={16} strokeWidth={1.75} aria-hidden /> Enregistrer</>}
            </AppButton>
          )}
          {canEdit && onPublish && (
            <AppButton type="button" variant="default" size="sm" className="inline-flex items-center gap-1.5" onClick={onPublish} disabled={publishing}>
              {publishing ? '…' : <><Rocket size={16} strokeWidth={1.75} aria-hidden /> Activer</>}
            </AppButton>
          )}
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            className="inline-flex items-center gap-1.5"
            onClick={onExportJson}
            title="Télécharger l'export JSON complet"
          >
            <Download size={16} strokeWidth={1.75} aria-hidden /> Exporter JSON
          </AppButton>
          {canEdit && publishedCount != null && (
            <span
              className="pta-badge pta-badge-published"
              style={{ padding: '5px 10px', fontSize: 10 }}
              title="Articles avec profil publié — publication par carte article"
            >
              ✓ {publishedCount} publié{publishedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </nav>
      {description && (
        <p className="pta-header-desc">{description}</p>
      )}
      <div className="pta-body-stack">
        {kpiStrip}
        <div className="pta-content" role="tabpanel">
          {children}
        </div>
      </div>
    </div>
  );
}
