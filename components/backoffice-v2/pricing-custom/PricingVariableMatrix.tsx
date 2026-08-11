'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { formatPriceAr } from '@/lib/data/catalogue';
import { uxToast } from '@/lib/ux/feedback';
import type { PricingVariableMatrixRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.types';

type Props = {
  rows: PricingVariableMatrixRow[];
  canEdit: boolean;
  onSaved?: () => void;
};

export function PricingVariableMatrix({ rows, canEdit, onSaved }: Props) {
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const getPrice = (row: PricingVariableMatrixRow) =>
    drafts[row.id] ?? row.priceModifier;

  const saveRow = async (row: PricingVariableMatrixRow) => {
    const priceModifier = getPrice(row);
    if (!canEdit) return;
    setSavingId(row.id);
    try {
      const r = await fetch(`/api/admin-backoffice/options/chips/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceModifier }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Prix variable enregistré');
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        onSaved?.();
      } else uxToast.error(d.error?.message ?? 'Erreur sauvegarde');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSavingId(null);
  };

  if (!rows.length) {
    return (
      <AdminEmptyState
        title="Aucune variable à impact prix pour cet article."
        className="py-6"
      />
    );
  }

  return (
    <div className="ab2-pricing-section">
      <h4 className="ab2-pricing-section-title">Matrice de prix par variables</h4>
      <div className="ab2-chips-table-wrap">
        <table className="ab2-tier-table ab2-pricing-matrix-table">
          <thead>
            <tr>
              <th>Bloc</th>
              <th>Champ</th>
              <th>Option / Valeur</th>
              <th>Mode</th>
              <th>Prix / supplément</th>
              <th>Actif</th>
              <th>Source</th>
              {canEdit && <th><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const dirty = drafts[row.id] != null && drafts[row.id] !== row.priceModifier;
              return (
                <tr key={row.id} className={!row.active ? 'is-archived' : ''}>
                  <td>{row.blockLabel}</td>
                  <td><code className="text-[10px]">{row.fieldKey}</code></td>
                  <td>{row.optionLabel}</td>
                  <td>supplément fixe</td>
                  <td>
                    {canEdit ? (
                      <input
                        type="number"
                        className="ab2-tier-input ab2-tier-input--wide"
                        value={getPrice(row)}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [row.id]: Number(e.target.value) || 0 }))
                        }
                      />
                    ) : (
                      formatPriceAr(row.priceModifier)
                    )}
                  </td>
                  <td>{row.active ? '✓' : '—'}</td>
                  <td className="text-[10px] opacity-70">{row.source}</td>
                  {canEdit && (
                    <td>
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!dirty || savingId === row.id}
                        onClick={() => saveRow(row)}
                      >
                        <Save className="inline h-3 w-3" />
                      </AppButton>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
