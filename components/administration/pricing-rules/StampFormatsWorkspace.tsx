'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw, ShieldCheck } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';

const STAMP_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'TYPE TAMPON',
  'FORMAT',
  'LARGEUR MM',
  'HAUTEUR MM',
  'RÉFÉRENCE',
  'PRIX VENTE',
  'UNITÉ',
  'FORMAT PERSONNALISÉ AUTORISÉ',
  'VISIBLE POS',
  'STATUT',
  'DÉTAIL',
] as const;

type Row = {
  id: string;
  excelId: string | null;
  articleLabel: string;
  stampType: string;
  formatLabel: string;
  widthMm: number;
  heightMm: number;
  reference: string | null;
  unitPrice: number;
  unit: string;
  allowCustomFormat: boolean;
  visiblePOS: boolean;
  status: string;
  details: string | null;
};

type Props = { canEdit: boolean };

export function StampFormatsWorkspace({ canEdit }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/tampons', { cache: 'no-store' });
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
    const r = await fetch('/api/admin-backoffice/pricing/tampons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Tampon mis à jour → sync POS');
    void load();
  };

  const exportRows = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/tampons?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportGenericRowsToXlsx(d.data.rows, [...STAMP_EXCEL_COLUMNS], 'tampons', 'Tampons');
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/pricing/tampons', {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Tampons — prix fixes</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Prix unitaire par type / format. Format personnalisé → format standard supérieur (pas de calcul surface).
            Modifiable ici et via Excel — sync POS automatique.
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
                  await fetch('/api/admin-backoffice/pricing/tampons', {
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

      {loading ? (
        <LoadingState message="Chargement…" size="sm" />
      ) : (
        <div className="overflow-x-auto rounded-[7px] border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Format</th>
                <th className="px-2 py-2 text-right">L mm</th>
                <th className="px-2 py-2 text-right">H mm</th>
                <th className="px-2 py-2 text-left">Réf.</th>
                <th className="px-2 py-2 text-right">Prix vente</th>
                <th className="px-2 py-2 text-left">POS</th>
                <th className="px-2 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-2 font-mono text-xs">{row.excelId}</td>
                  <td className="px-2 py-2">{row.stampType}</td>
                  <td className="px-2 py-2 font-medium">{row.formatLabel}</td>
                  <td className="px-2 py-2 text-right">{row.widthMm}</td>
                  <td className="px-2 py-2 text-right">{row.heightMm}</td>
                  <td className="px-2 py-2 font-mono text-xs">{row.reference}</td>
                  <td className="px-2 py-2 text-right">
                    {canEdit ? (
                      <input
                        type="number"
                        defaultValue={row.unitPrice}
                        className="w-28 text-right rounded border border-border px-1 py-0.5 text-xs"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== row.unitPrice) void patch(row.id, { unitPrice: v });
                        }}
                      />
                    ) : (
                      row.unitPrice
                    )}
                  </td>
                  <td className="px-2 py-2">{row.visiblePOS ? 'oui' : 'non'}</td>
                  <td className="px-2 py-2">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
