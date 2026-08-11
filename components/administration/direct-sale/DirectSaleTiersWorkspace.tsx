'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Upload, RefreshCw, Trash2 } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { DIRECT_SALE_TIER_EXCEL_COLUMNS } from '@/lib/backoffice/direct-sale-excel-format';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';
import {
  formatTierDiscount,
  formatTierQtyRange,
  TIER_DISCOUNT_TYPE_OPTIONS,
} from '@/lib/direct-sale/tier-labels';

type TierFlatRow = {
  id: string;
  minQty: number;
  maxQty: number | null;
  discountType: string;
  discountValue: number;
  finalUnitPrice: number | null;
  label: string | null;
  article: {
    id: string;
    name: string;
    reference: string | null;
    unitPrice: number;
    unit: string;
    status: string;
    visiblePOS: boolean;
  };
};

type Props = { canEdit: boolean };

export function DirectSaleTiersWorkspace({ canEdit }: Props) {
  const [rows, setRows] = useState<TierFlatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/tiers', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const exportExcel = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/tiers/export-excel');
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error('Export impossible');
      exportGenericRowsToXlsx(d.data.rows, DIRECT_SALE_TIER_EXCEL_COLUMNS, 'paliers-vente-directe', 'Paliers');
      uxToast.success('Export Excel téléchargé');
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Export impossible');
    }
  };

  const importExcel = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/direct-sale/tiers/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      const rep = d.data;
      uxToast.success(`Paliers : ${rep.created} créé(s), ${rep.updated} MAJ, ${rep.synced} sync POS`);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Import impossible');
    }
  };

  const removeTier = async (row: TierFlatRow) => {
    try {
      const r = await fetch(
        `/api/admin-backoffice/direct-sale/articles/${row.article.id}/tiers/${row.id}`,
        { method: 'DELETE' },
      );
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Suppression impossible');
      uxToast.success('Palier retiré');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const updateTier = async (row: TierFlatRow, patch: Record<string, unknown>) => {
    try {
      const r = await fetch(
        `/api/admin-backoffice/direct-sale/articles/${row.article.id}/tiers/${row.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        },
      );
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Mise à jour impossible');
      uxToast.success('Palier mis à jour');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  return (
    <div className="ds-tiers-workspace space-y-3">
      <div className="ds-tiers-toolbar">
        <AppButton type="button" size="sm" onClick={() => void load()} variant="outline" className="h-8 min-h-8 max-h-8 text-sm">
          <RefreshCw size={14} /> Actualiser
        </AppButton>
        <AppButton type="button" size="sm" onClick={() => void exportExcel()} variant="outline" className="h-8 min-h-8 max-h-8 text-sm">
          <Download size={14} /> Export Excel
        </AppButton>
        {canEdit && (
          <>
            <AppButton type="button" size="sm" onClick={() => fileRef.current?.click()} variant="default" className="h-8 min-h-8 max-h-8 text-sm">
              <Upload size={14} /> Import Excel
            </AppButton>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importExcel(f);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>

      {loading ? (
        <LoadingState message="Chargement…" size="sm" />
      ) : rows.length === 0 ? (
        <div className="rounded-[7px] border border-dashed border-border p-12 text-center">
          <p className="font-semibold">Aucun palier configuré</p>
          <p className="text-sm text-muted-foreground mt-1">
            Importez un fichier Excel ou ajoutez des paliers depuis{' '}
            <Link href="/administration/articles-vente-directe" className="text-primary underline">
              Articles vente directe
            </Link>.
          </p>
        </div>
      ) : (
        <div className="ds-tiers-table-wrap">
          <table className="ds-tiers-table w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Article</th>
                <th className="text-left">Réf.</th>
                <th className="text-left">Quantité</th>
                <th className="text-left">Type remise</th>
                <th className="text-right">Valeur</th>
                <th className="text-right">Prix appliqué</th>
                <th className="text-left">Libellé</th>
                {canEdit && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{row.article.name}</td>
                  <td className="font-mono text-xs">{row.article.reference ?? '—'}</td>
                  <td className="font-mono text-xs whitespace-nowrap">
                    {formatTierQtyRange(row.minQty, row.maxQty)}
                  </td>
                  <td className="text-xs">
                    {TIER_DISCOUNT_TYPE_OPTIONS.find((o) => o.id === row.discountType)?.label ?? row.discountType}
                  </td>
                  <td className="text-right">
                    {canEdit ? (
                      <input
                        type="number"
                        defaultValue={row.discountValue}
                        className="w-20 text-right rounded-[7px] border border-border bg-background px-2 py-1 text-xs font-mono h-8"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== row.discountValue) void updateTier(row, { discountValue: v });
                        }}
                      />
                    ) : (
                      <span className="font-mono text-xs">{row.discountValue}</span>
                    )}
                  </td>
                  <td className="text-right font-mono text-xs font-bold text-primary">
                    {canEdit && row.discountType === 'unit_price' ? (
                      <input
                        type="number"
                        defaultValue={row.finalUnitPrice ?? row.discountValue}
                        className="w-24 text-right rounded-[7px] border border-border bg-background px-2 py-1 text-xs font-mono h-8"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          const cur = row.finalUnitPrice ?? row.discountValue;
                          if (v !== cur) void updateTier(row, { finalUnitPrice: v });
                        }}
                      />
                    ) : (
                      formatTierDiscount(row, row.article.unitPrice)
                    )}
                  </td>
                  <td className="text-xs text-muted-foreground">{row.label ?? '—'}</td>
                  {canEdit && (
                    <td className="text-right">
                      <AppButton
                        type="button"
                        size="sm"
                        onClick={() => void removeTier(row)}
                        variant="ghost"
                        className="h-8 min-h-8 max-h-8 w-8 p-0 text-red-500"
                        aria-label="Retirer le palier"
                      >
                        <Trash2 size={14} />
                      </AppButton>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
