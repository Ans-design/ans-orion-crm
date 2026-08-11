'use client';

import type { PricingBusinessRuleRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.types';

type Props = {
  rules: PricingBusinessRuleRow[];
  articleId: string;
};

export function PricingBusinessRulesPanel({ rules, articleId }: Props) {
  if (!rules.length) {
    return (
      <div className="ab2-pricing-section">
        <h4 className="ab2-pricing-section-title">Règles métier de l&apos;article</h4>
        <p className="ab2-empty text-sm">
          Aucune règle liée à <code>{articleId}</code> ou à sa famille.
        </p>
      </div>
    );
  }

  return (
    <div className="ab2-pricing-section">
      <h4 className="ab2-pricing-section-title">Règles métier de l&apos;article</h4>
      <div className="ab2-chips-table-wrap">
        <table className="ab2-tier-table">
          <thead>
            <tr>
              <th>Règle</th>
              <th>Type</th>
              <th>Impact prix</th>
              <th>Priorité</th>
              <th>Actif</th>
              <th>Connectée</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className={!r.active ? 'is-archived' : ''}>
                <td>{r.ruleName}</td>
                <td><code className="text-[10px]">{r.ruleType}</code></td>
                <td>{r.impactsPrice ? '✓' : '—'}</td>
                <td>{r.priority}</td>
                <td>{r.active ? '✓' : '—'}</td>
                <td>{r.connected ? '✓' : '—'}</td>
                <td className="text-xs opacity-80">{r.message ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
