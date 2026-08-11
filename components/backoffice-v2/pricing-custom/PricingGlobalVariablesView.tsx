'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import type { PricingVariableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.types';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { pricingVariableToExcelRow, validateVariablesExcelRows } from '@/lib/backoffice/variables-excel-format';
import { OptionsLoadingState } from '../options/OptionsLoadingState';

type Props = {
  impact: 'price' | 'indicative';
  canEdit?: boolean;
};

export function PricingGlobalVariablesView({ impact, canEdit = false }: Props) {
  const [rows, setRows] = useState<PricingVariableRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin-backoffice/pricing/variables?impact=${impact}&limit=800`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setRows(d.data?.rows ?? []);
    } catch {
      setRows([]);
    }
    setLoading(false);
  }, [impact]);

  useEffect(() => { load(); }, [load]);

  const title = impact === 'price'
    ? 'Vue globale — Variables impact prix'
    : 'Vue globale — Variables sans impact prix';

  if (loading) return <OptionsLoadingState variant="table" rows={10} />;

  return (
    <div className="ab2-pricing-section">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h4 className="ab2-pricing-section-title mb-0">{title}</h4>
        <div className="flex items-center gap-2">
          <AppButton type="button" variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="inline h-3.5 w-3.5 mr-1" />
            Actualiser
          </AppButton>
          <ExcelTableActions
            fileStem={`variables-globales-${impact}`}
            sheetName="Variables"
            canImport={canEdit}
            validateRows={validateVariablesExcelRows}
            getExportRows={() =>
              rows.map((r, i) =>
                pricingVariableToExcelRow(r, String(i + 1).padStart(3, '0')),
              )
            }
            onImportRows={async (importRows, ctx) => {
              const r = await fetch('/api/admin-backoffice/pricing/variables/import-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: importRows, fileName: ctx?.fileName }),
              });
              const d = await r.json();
              if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
              await load();
              return d.data;
            }}
          />
        </div>
      </div>
      <div className="ab2-chips-table-wrap">
        <table className="ab2-tier-table ab2-pricing-global-vars">
          <thead>
            <tr>
              <th>Bloc</th>
              <th>Champ</th>
              <th>Libellé</th>
              <th>Impact prix</th>
              <th>Indicatif</th>
              <th>POS</th>
              <th>Montant</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.blockLabel}</td>
                <td><code className="text-[10px]">{r.fieldKey}</code></td>
                <td>{r.label}</td>
                <td>{r.impactsPrice ? '✓' : '—'}</td>
                <td>{r.isInformational ? '✓' : '—'}</td>
                <td>{r.visiblePos ? '✓' : '—'}</td>
                <td>{r.priceModifier != null ? r.priceModifier : '—'}</td>
                <td className="text-[10px] opacity-70">{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
