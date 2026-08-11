'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import type { ChipArticleSummary } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { catalogueArticleToExcel } from '@/lib/backoffice/catalogue-pos-excel-format';
import { OptionsEmptyState } from '@/components/backoffice-v2/options/OptionsEmptyState';
import { OptionsLoadingState } from '@/components/backoffice-v2/options/OptionsLoadingState';
import { AdminActionsColumnHeader } from '@/components/admin/AdminRowActions';

type Props = {
  canEdit: boolean;
  onDataChanged?: () => void;
};

export function CatalogueArticlesCorbeilleTable({ canEdit, onDataChanged }: Props) {
  const [rows, setRows] = useState<ChipArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status: 'archived', includeInactive: '1' });
      const r = await fetch(`/api/admin-backoffice/options/articles?${qs}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows((d.data?.articles ?? []).filter((row: ChipArticleSummary) => row.status === 'archived'));
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur corbeille articles');
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
        r.articleId.toLowerCase().includes(q)
        || r.articleLabel.toLowerCase().includes(q)
        || r.family.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const restore = async (row: ChipArticleSummary) => {
    if (!canEdit) return;
    setBusyId(row.articleId);
    try {
      const r = await fetch(`/api/backoffice/articles/${row.articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', active: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Restauration impossible');
      uxToast.success(`« ${row.articleLabel} » restauré en brouillon`);
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
          Articles catalogue archivés — restauration en statut brouillon sans perte de données.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <AppButton type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className={`inline h-3.5 w-3.5 mr-1${loading ? ' animate-spin' : ''}`} />
            Actualiser
          </AppButton>
          <ExcelTableActions
            fileStem="catalogue-pos-corbeille"
            sheetName="Corbeille articles"
            canImport={false}
            getExportRows={() =>
              filtered.map((r, i) =>
                catalogueArticleToExcel(r, String(i + 1).padStart(3, '0')) as unknown as Record<string, unknown>,
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
        <OptionsEmptyState title="Corbeille vide" description="Aucun article archivé." />
      ) : (
        <div className="ab2-chips-table-wrap">
          <table className="ab2-tier-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Article</th>
                <th>Famille</th>
                <th>Variables</th>
                {canEdit && <AdminActionsColumnHeader />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.articleId}>
                  <td className="font-mono text-xs">{row.articleId}</td>
                  <td>{row.articleLabel}</td>
                  <td>{row.family}</td>
                  <td>{row.variableCount}</td>
                  {canEdit && (
                    <td className="orion-admin-actions-td">
                      <AppButton type="button" variant="outline" size="sm" disabled={busyId === row.articleId}
                        onClick={() => void restore(row)}
                      >
                        <RotateCcw className="inline h-3.5 w-3.5 mr-1" />
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
