'use client';

import type { PricingDiffRow, PricingVariableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.types';

export function PricingVariablesTable({ rows, title }: { rows: PricingVariableRow[]; title: string }) {
  if (!rows.length) {
    return <p className="ab2-empty text-sm">Aucune variable pour cette section.</p>;
  }

  return (
    <div className="ab2-pricing-section">
      <h4 className="ab2-pricing-section-title">{title}</h4>
      <div className="ab2-chips-table-wrap">
        <table className="ab2-tier-table ab2-pricing-vars-table">
          <thead>
            <tr>
              <th>Bloc</th>
              <th>Champ</th>
              <th>Libellé</th>
              <th>Impact prix</th>
              <th>Indicatif</th>
              <th>POS</th>
              <th>Actif</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={!r.active ? 'is-archived' : ''}>
                <td>{r.blockLabel}</td>
                <td><code className="text-[10px]">{r.fieldKey}</code></td>
                <td>{r.label}</td>
                <td>{r.impactsPrice ? '✓' : '—'}</td>
                <td>{r.isInformational ? '✓' : '—'}</td>
                <td>{r.visiblePos ? '✓' : '—'}</td>
                <td>{r.active ? '✓' : '—'}</td>
                <td className="text-[10px] opacity-70">{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PricingDiffTable({ rows }: { rows: PricingDiffRow[] }) {
  return (
    <div className="ab2-pricing-section">
      <h4 className="ab2-pricing-section-title">Diff Backoffice vs POS publié</h4>
      <div className="ab2-chips-table-wrap">
        <table className="ab2-tier-table">
          <thead>
            <tr>
              <th>Élément</th>
              <th>Brouillon</th>
              <th>POS publié</th>
              <th>Impact</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.element} className={r.differs ? 'ab2-diff-row-warn' : ''}>
                <td>{r.element}</td>
                <td>{r.draftValue}</td>
                <td>{r.publishedValue}</td>
                <td>
                  <span className={`ab2-badge ab2-badge-${r.impact === 'critical' ? 'danger' : r.impact === 'warning' ? 'warning' : 'muted'}`}>
                    {r.impact}
                  </span>
                </td>
                <td className="text-xs">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
