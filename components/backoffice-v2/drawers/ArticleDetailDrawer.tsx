'use client';

import { X } from 'lucide-react';
import type { ArticlePriceTableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import { AdminStatusBadge, formulaStatusKind, publicationStatusKind } from '../ui/AdminStatusBadge';
import dynamic from 'next/dynamic';

const ArticlePricingCard = dynamic(
  () => import('@/components/admin/article-pricing-card').then((m) => m.ArticlePricingCard),
  { loading: () => <p className="ab2-empty text-sm p-4">Chargement…</p> },
);

type Props = {
  row: ArticlePriceTableRow | null;
  canEdit: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

export function ArticleDetailDrawer({ row, canEdit, onClose, onUpdated }: Props) {
  if (!row) return null;

  return (
    <>
      <button type="button" className="ab2-drawer-backdrop" onClick={onClose} aria-label="Fermer" />
      <aside className="ab2-drawer" aria-label={`Détail ${row.articleLabel}`}>
        <header className="ab2-drawer-header">
          <div>
            <p className="ab2-drawer-kicker">{row.family} · {row.category}</p>
            <h2 className="ab2-drawer-title">
              <span className="mr-2">{row.icon}</span>
              {row.articleLabel}
            </h2>
            <p className="ab2-drawer-meta">{row.articleId}</p>
          </div>
          <button type="button" className="ab2-drawer-close" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="ab2-drawer-summary">
          <AdminStatusBadge
            kind={row.visiblePos ? 'pos-visible' : 'pos-hidden'}
            label={row.visiblePos ? 'Visible POS' : 'Masqué POS'}
          />
          <AdminStatusBadge kind={formulaStatusKind(row.formulaStatus)} label={`Formule ${row.formulaStatus}`} />
          <AdminStatusBadge kind={publicationStatusKind(row.publicationStatus)} label={row.publicationStatus} />
          {(row.anomalyCritical > 0 || row.anomalyWarning > 0) && (
            <AdminStatusBadge
              kind="anomaly"
              label={`${row.anomalyCritical + row.anomalyWarning} anomalie(s)`}
            />
          )}
        </div>

        <div className="ab2-drawer-grid">
          <div className="ab2-drawer-stat">
            <span className="label">Prix base</span>
            <span className="value">{row.prixBase != null ? `${row.prixBase} Ar` : '—'}</span>
          </div>
          <div className="ab2-drawer-stat">
            <span className="label">Qté min</span>
            <span className="value">{row.qtyMin ?? '—'}</span>
          </div>
          <div className="ab2-drawer-stat">
            <span className="label">Paliers</span>
            <span className="value">{row.tiersCount}</span>
          </div>
          <div className="ab2-drawer-stat">
            <span className="label">Matières</span>
            <span className="value">{row.materialCount}</span>
          </div>
        </div>

        <div className="ab2-drawer-body">
          <ArticlePricingCard
            articleId={row.articleId}
            canEdit={canEdit}
            catalogMode
            onUpdated={onUpdated}
          />
        </div>
      </aside>
    </>
  );
}
