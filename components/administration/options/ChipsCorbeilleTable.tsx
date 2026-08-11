'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import type { ChipTableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { chipRowToExcel } from '@/lib/backoffice/chips-excel-format';
import { OptionsEmptyState } from '@/components/backoffice-v2/options/OptionsEmptyState';
import { OptionsLoadingState } from '@/components/backoffice-v2/options/OptionsLoadingState';
import { AdminActionsColumnHeader } from '@/components/admin/AdminRowActions';

type Props = {
  canEdit: boolean;
  onDataChanged?: () => void;
};

export function ChipsCorbeilleTable({ canEdit, onDataChanged }: Props) {
  const [rows, setRows] = useState<ChipTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ includeArchived: '1', status: 'archived', limit: '2000' });
      const r = await fetch(`/api/admin-backoffice/options/chips?${qs}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows((d.data?.rows ?? []).filter((row: ChipTableRow) => row.archived));
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur corbeille chips');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.articleLabel.toLowerCase().includes(q)
        || r.fieldKey.toLowerCase().includes(q)
        || r.label.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const restore = async (row: ChipTableRow) => {
    if (!canEdit) return;
    setBusyId(row.groupId);
    try {
      const r = await fetch(`/api/admin-backoffice/options/chips/${row.groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Restauration impossible');
      uxToast.success('Variable restaurée');
      await load();
      onDataChanged?.();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Variables / chips archivées — restauration sans perte de données.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <AppButton type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className={`inline h-3.5 w-3.5 mr-1${loading ? ' animate-spin' : ''}`} />
            Actualiser
          </AppButton>
          <ExcelTableActions
            fileStem="options-chips-corbeille"
            sheetName="Corbeille chips"
            canImport={false}
            getExportRows={() =>
              filtered.map((r, i) =>
                chipRowToExcel(r, r.excelRowId ?? String(i + 1).padStart(3, '0')),
              )
            }
          />
        </div>
      </div>

      <input
        type="search"
        className="ab2-input max-w-md"
        placeholder="Rechercher dans la corbeille…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <OptionsLoadingState variant="table" rows={6} />
      ) : filtered.length === 0 ? (
        <OptionsEmptyState title="Corbeille vide" description="Aucune variable archivée." />
      ) : (
        <div className="ab2-chips-table-wrap">
          <table className="ab2-tier-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Champ</th>
                <th>Libellé</th>
                <th>Bloc</th>
                {canEdit && <AdminActionsColumnHeader />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.articleLabel}</td>
                  <td><code className="text-[10px]">{row.fieldKey}</code></td>
                  <td>{row.label}</td>
                  <td>{row.blockLabel}</td>
                  {canEdit && (
                    <td className="orion-admin-actions-td">
                      <AppButton type="button" variant="outline" size="sm" disabled={busyId === row.groupId}
                        onClick={() => void restore(row)}
                      >
                        <RotateCcw className="inline h-3 w-3 mr-1" />
                        Restaurer
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
