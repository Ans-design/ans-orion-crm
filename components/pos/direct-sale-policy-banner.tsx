'use client';

import Link from 'next/link';
import { Tag, FileText, AlertCircle } from 'lucide-react';
import type { PosCatalogueItem } from '@/lib/services/catalogue-pos-builder';

type Props = {
  article: PosCatalogueItem | null | undefined;
  className?: string;
  /** Variante inline dans la topbar (1 ligne compacte) */
  compact?: boolean;
};

/** Bandeau politique tarifaire — articles vente directe / grille PRIX 2026 au POS. */
export function DirectSalePolicyBanner({ article, className = '', compact = false }: Props) {
  const ds = article?.directSale;
  if (!ds) return null;

  const adminHref = article?.adminFixHref || '/administration/articles-vente-directe';
  const isExcel = ds.pricingMode === 'excel_grid' || Boolean(ds.excelSheet);
  const title = isExcel ? 'Prix standard — PRIX 2026' : 'Prix standard — vente directe';
  const priceLine =
    ds.unitPrice > 0
      ? `${ds.unitPrice.toLocaleString('fr-FR')} Ar / ${ds.unit} (qté min. ${ds.minQuantity})`
      : 'Prix à confirmer en administration';

  if (compact) {
    return (
      <div className={`pos-policy-inline ${className}`.trim()}>
        <div className="pos-policy-inline__main">
          <p className="pos-policy-inline__title">
            <Tag size={12} className="shrink-0" aria-hidden />
            {title}
          </p>
          <p className="pos-policy-inline__text">
            {priceLine}
            {isExcel && ds.excelSheet ? ` · « ${ds.excelSheet} »` : ''}
            {ds.addonCount > 0 ? ` · ${ds.addonCount} suppl.` : ''}
          </p>
        </div>
        <div className="pos-policy-inline__meta">
          {ds.isCustomizable && (
            <span className="pos-soft-alert__chip">Personnalisation possible</span>
          )}
          {ds.requiresQuoteIfCustom && (
            <span className="pos-soft-alert__chip pos-soft-alert__chip--warn">
              <AlertCircle size={10} /> Devis si hors standard
            </span>
          )}
          {ds.allowManualPrice && (
            <span className="pos-soft-alert__chip">Prix manuel</span>
          )}
          <Link href={adminHref} className="pos-soft-alert__link inline-flex items-center gap-1">
            <FileText size={11} /> Voir en administration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`pos-soft-alert pos-soft-alert--info ${className}`}>
      <div className="flex items-start gap-2">
        <Tag size={14} className="text-[var(--pos-brand,#FF174D)] shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="pos-soft-alert__title">{title}</p>
          <p className="pos-soft-alert__text mt-0.5">
            {priceLine}
            {isExcel && ds.excelSheet ? ` · onglet « ${ds.excelSheet} »` : ''}
            {ds.addonCount > 0 && ` · ${ds.addonCount} supplément(s) disponible(s)`}
          </p>
        </div>
      </div>
      {(ds.isCustomizable || ds.requiresQuoteIfCustom || ds.allowManualPrice) && (
        <div className="flex flex-wrap gap-1.5">
          {ds.isCustomizable && (
            <span className="pos-soft-alert__chip">Personnalisation possible</span>
          )}
          {ds.requiresQuoteIfCustom && (
            <span className="pos-soft-alert__chip pos-soft-alert__chip--warn">
              <AlertCircle size={10} /> Devis si hors standard
            </span>
          )}
          {ds.allowManualPrice && (
            <span className="pos-soft-alert__chip">Prix manuel autorisé</span>
          )}
        </div>
      )}
      <Link href={adminHref} className="pos-soft-alert__link inline-flex items-center gap-1">
        <FileText size={11} /> Voir en administration
      </Link>
    </div>
  );
}
