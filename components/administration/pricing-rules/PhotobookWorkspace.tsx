'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw, ShieldCheck } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';

const PHOTOBOOK_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'FORMAT',
  'LARGEUR MM',
  'HAUTEUR MM',
  'PRIX PAGE A4',
  'RATIO A4',
  'PRIX PAGE FORMAT',
  'TYPE COUVERTURE',
  'SUPPLÉMENT COUVERTURE',
  'UNITÉ',
  'VISIBLE POS',
  'STATUT',
  'DÉTAIL',
] as const;

type Row = {
  id: string;
  excelId: string | null;
  label: string;
  prixPageA4: number;
  softCoverSupplement: number;
  rigidCoverSupplement: number;
  leatherCoverSupplement: number;
  customCoverSupplement: number;
  visiblePOS: boolean;
  details: string | null;
};

type Props = { canEdit: boolean };

export function PhotobookWorkspace({ canEdit }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/photobook', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    const r = await fetch('/api/admin-backoffice/pricing/photobook', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Photobook mis à jour → sync POS');
    void load();
  };

  const exportRows = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/photobook?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportGenericRowsToXlsx(d.data.rows, [...PHOTOBOOK_EXCEL_COLUMNS], 'photobook', 'Photobook');
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/pricing/photobook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', rows: parsed }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      uxToast.success(`Import : ${d.data.created} créé(s), ${d.data.updated} MAJ`);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Import impossible');
    }
  };

  const row = rows[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Photobook — prix page & couvertures</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Prix page A4 (défaut 4 000 Ar) × ratio format ISF + supplément couverture / book.
            Couverture souple = 0. Formats = règles Impression sans finition (+ tolérance carré A5).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppButton type="button" onClick={() => void load()}  variant="outline" className="text-sm">
            <RefreshCw size={14} /> Actualiser
          </AppButton>
          <AppButton type="button" onClick={() => void exportRows()}  variant="outline" className="text-sm">
            <Download size={14} /> Export Excel
          </AppButton>
          {canEdit && (
            <>
              <AppButton type="button" onClick={() => fileRef.current?.click()}  variant="outline" className="text-sm">
                <Upload size={14} /> Import Excel
              </AppButton>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importFile(f);
                  e.target.value = '';
                }}
              />
              <AppButton type="button" variant="default" className="text-sm" onClick={async () => {
                  await fetch('/api/admin-backoffice/pricing/photobook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sync' }),
                  });
                  uxToast.success('Sync POS');
                  void load();
                }}
              >
                <ShieldCheck size={14} /> Sync POS
              </AppButton>
            </>
          )}
        </div>
      </div>

      {loading || !row ? (
        <LoadingState message="Chargement…" size="sm" />
      ) : (
        <div className="overflow-x-auto rounded-[7px] border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Article</th>
                <th className="px-2 py-2 text-right">Prix page A4</th>
                <th className="px-2 py-2 text-right">Couv. souple</th>
                <th className="px-2 py-2 text-right">Couv. rigide</th>
                <th className="px-2 py-2 text-right">Couv. cuir</th>
                <th className="px-2 py-2 text-right">Couv. perso</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-2 py-2 font-medium">{row.label}</td>
                {(
                  [
                    ['prixPageA4', row.prixPageA4],
                    ['softCoverSupplement', row.softCoverSupplement],
                    ['rigidCoverSupplement', row.rigidCoverSupplement],
                    ['leatherCoverSupplement', row.leatherCoverSupplement],
                    ['customCoverSupplement', row.customCoverSupplement],
                  ] as const
                ).map(([key, val]) => (
                  <td key={key} className="px-2 py-2 text-right">
                    {canEdit ? (
                      <input
                        type="number"
                        defaultValue={val}
                        className="w-28 text-right rounded border border-border px-1 py-0.5 text-xs"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== val) void patch(row.id, { [key]: v });
                        }}
                      />
                    ) : (
                      val
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground px-3 py-2">
            Formule : (prix_page_format × pages) + supplément_couverture × quantité books. Papier intérieur n’impacte pas le prix.
          </p>
        </div>
      )}
    </div>
  );
}
