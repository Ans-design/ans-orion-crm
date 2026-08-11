'use client';

import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/ui/app-ui';
import { OrionPanelDrawer } from '@/components/ui/orion-panel-drawer';
import { computeMarginPct, MarginIndicator } from './MarginIndicator';
import '@/components/backoffice-v2/pricing-custom/material-prices/material-sheet.css';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  canEdit?: boolean;
  saving?: boolean;
  onSave?: () => void | Promise<void>;
  onSaveAndSync?: () => void | Promise<void>;
  children?: ReactNode;
  /** En-tête riche (badges) — comme fiche matière */
  headerContent?: ReactNode;
  /** Largeur max du panneau centré */
  widthClass?: string;
  /** Champs identité / tarification contrôlés pour jauge marge */
  purchasePrice?: number;
  salePrice?: number;
  onPurchaseChange?: (v: number) => void;
  onSaleChange?: (v: number) => void;
  className?: string;
};

/**
 * Panneau centré (même shell que fiche matière OrionPanelDrawer sheet).
 * Les formulaires métier restent branchés via children / callbacks.
 */
export function EntityDrawer({
  open,
  onClose,
  title = 'Ajouter / modifier',
  subtitle = 'Les champs sont validés contre le modèle de données POS.',
  canEdit = true,
  saving,
  onSave,
  onSaveAndSync,
  children,
  headerContent,
  widthClass = 'max-w-[min(calc(100vw-2rem),560px)]',
  purchasePrice = 0,
  salePrice = 0,
  onPurchaseChange,
  onSaleChange,
  className,
}: Props) {
  const margin = useMemo(
    () => computeMarginPct(salePrice, purchasePrice),
    [salePrice, purchasePrice],
  );

  const footer =
    canEdit && (onSave || onSaveAndSync) ? (
      <>
        <AppButton type="button" variant="outline" onClick={onClose} disabled={saving}>
          Annuler
        </AppButton>
        {onSave ? (
          <AppButton
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </AppButton>
        ) : null}
        {onSaveAndSync ? (
          <AppButton
            type="button"
            variant="default"
            disabled={saving}
            onClick={() => void onSaveAndSync()}
          >
            {saving ? 'Sync…' : 'Sauvegarder & Synchroniser POS'}
          </AppButton>
        ) : null}
      </>
    ) : (
      <AppButton type="button" variant="outline" onClick={onClose}>
        Fermer
      </AppButton>
    );

  return (
    <OrionPanelDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      variant="sheet"
      widthClass={widthClass}
      panelClassName="orion-mat-sheet--compact"
      headerContent={headerContent}
      footer={footer}
    >
      <div className={cn('entity-drawer-sheet space-y-5', className)}>
        {(onPurchaseChange || onSaleChange) && (
          <section className="orion-mat-sheet-section">
            <h3 className="orion-mat-sheet-section-title">Tarification</h3>
            <div className="orion-mat-sheet-grid">
              <label className="orion-mat-sheet-field">
                <span className="orion-mat-sheet-label">Prix achat</span>
                <input
                  type="number"
                  className="orion-mat-sheet-input"
                  value={purchasePrice || ''}
                  disabled={!canEdit}
                  onChange={(e) => onPurchaseChange?.(Number(e.target.value))}
                />
              </label>
              <label className="orion-mat-sheet-field">
                <span className="orion-mat-sheet-label">Prix vente</span>
                <input
                  type="number"
                  className="orion-mat-sheet-input"
                  value={salePrice || ''}
                  disabled={!canEdit}
                  onChange={(e) => onSaleChange?.(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-[11px] text-[var(--text-muted)]">Marge temps réel</p>
              <MarginIndicator marginPct={margin} />
            </div>
          </section>
        )}
        {children}
      </div>
    </OrionPanelDrawer>
  );
}
