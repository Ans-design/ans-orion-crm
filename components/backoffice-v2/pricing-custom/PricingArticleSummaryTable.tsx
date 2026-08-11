'use client';

import { formatPriceAr } from '@/lib/data/catalogue';
import type { PricingArticleDetailPayload } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.types';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type Props = {
  detail: PricingArticleDetailPayload;
};

export function PricingArticleSummaryTable({ detail }: Props) {
  const { article, summary } = detail;
  const rows = [
    ['Article', article.articleLabel],
    ['Code', article.articleId],
    ['Famille', article.family],
    ['Type calcul', summary.calculationType],
    ['Unité', summary.saleUnit],
    ['Minimum commande', summary.qtyMin != null ? String(summary.qtyMin) : '—'],
    ['Prix base', summary.prixBase != null ? formatPriceAr(summary.prixBase) : '—'],
    ['Prix m²', summary.prixM2 != null ? formatPriceAr(summary.prixM2) : '—'],
    ['Formule', summary.formulaLabel ?? (summary.formulaVersion ? `v${summary.formulaVersion}` : '—')],
    ['Statut formule', summary.formulaStatus],
    ['Publication POS', summary.isPublished ? adminStatusLabel('published') : `${adminStatusLabel('archived')} / ${adminStatusLabel('draft')}`],
    ['Dernière MAJ', summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleString('fr-FR') : '—'],
    ['Variables', `${article.variableCount} (${article.priceImpactCount} impact prix)`],
    ['Paliers', article.tiersSummary],
  ];

  return (
    <div className="ab2-chips-table-wrap ab2-pricing-summary-table">
      <table className="ab2-tier-table">
        <thead>
          <tr>
            <th>Champ</th>
            <th>Valeur</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="font-medium opacity-80">{label}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {summary.formulaExpression && (
        <div className="ab2-pricing-formula-expr mt-3 p-3 rounded-lg bg-black/20 text-xs font-mono">
          <div className="text-[10px] uppercase opacity-60 mb-1">Expression formule</div>
          {summary.formulaExpression}
        </div>
      )}
    </div>
  );
}
