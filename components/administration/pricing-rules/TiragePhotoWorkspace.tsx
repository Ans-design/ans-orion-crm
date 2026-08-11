'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw, ShieldCheck } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';

const TIRAGE_PHOTO_EXCEL_COLUMNS = [
  'ID', 'ARTICLE', 'FORMAT', 'LARGEUR MM', 'HAUTEUR MM', 'FORMAT FACTURATION',
  'RATIO A4', 'PRIX BASE A4', 'DÉCOUPE AR', 'SUPPLÉMENT AR', 'PRIX CALCULÉ',
  'TYPE PAPIER', 'IMPACT PRIX TYPE PAPIER', 'VISIBLE POS', 'STATUT', 'DÉTAIL',
] as const;

type Row = {
  id: string;
  excelId: string | null;
  label: string;
  prixBaseA4: number;
  visiblePOS: boolean;
  details: string | null;
};

type Props = { canEdit: boolean };

export function TiragePhotoWorkspace({ canEdit }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/tirage-photo', { cache: 'no-store' });
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
    const r = await fetch('/api/admin-backoffice/pricing/tirage-photo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Tirage photo mis à jour → sync POS');
    void load();
  };

  const exportRows = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/tirage-photo?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportGenericRowsToXlsx(d.data.rows, [...TIRAGE_PHOTO_EXCEL_COLUMNS], 'tirage-photo', 'Tirage photo');
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/pricing/tirage-photo', {
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
  const a4 = row?.prixBaseA4 ?? 3000;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Tirage photo — prix base A4</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Base papier photo A4 (défaut 3 000 Ar). Formats = règles Impression sans finition
            (A5 = A4/2 sans découpe, A6 = A4/4 + 50 Ar découpe, A3 = A4×2, A3+ = A3 + supplément).
            Type papier sans impact prix. Découpe / suppléments : Administration → Paramètres formats papier.
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
                  await fetch('/api/admin-backoffice/pricing/tirage-photo', {
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
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-[7px] border border-border">
            <table className="w-full text-sm">
              <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Article</th>
                  <th className="px-2 py-2 text-right">Prix base A4</th>
                  <th className="px-2 py-2 text-right">A5 (calc.)</th>
                  <th className="px-2 py-2 text-right">A6 (calc.)</th>
                  <th className="px-2 py-2 text-right">A3 (calc.)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-2 py-2 font-medium">{row.label}</td>
                  <td className="px-2 py-2 text-right">
                    {canEdit ? (
                      <input
                        type="number"
                        defaultValue={row.prixBaseA4}
                        className="w-28 text-right rounded border border-border px-1 py-0.5 text-xs"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== row.prixBaseA4) void patch(row.id, { prixBaseA4: v });
                        }}
                      />
                    ) : (
                      row.prixBaseA4
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs">{Math.round(a4 / 2) + 50}</td>
                  <td className="px-2 py-2 text-right font-mono text-xs">{Math.round(a4 / 4) + 50}</td>
                  <td className="px-2 py-2 text-right font-mono text-xs">{Math.round(a4 * 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Une seule carte POS « Tirage photo ». Pelliculage / finitions complexes exclus.
            Impact type papier = non.
          </p>
        </div>
      )}
    </div>
  );
}
