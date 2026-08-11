'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';

const COLUMNS = [
  'ID',
  'FORMAT AFFICHÉ',
  'LARGEUR MM',
  'HAUTEUR MM',
  'FORMAT FACTURATION',
  'LARGEUR FACTURATION MM',
  'HAUTEUR FACTURATION MM',
  'CATÉGORIE',
  'ACTIF',
  'VISIBLE POS',
  'DÉTAIL',
] as const;

type Row = {
  id: string;
  excelId: string | null;
  displayLabel: string;
  widthMm: number;
  heightMm: number;
  billingFormat: string;
  billingWidthMm: number;
  billingHeightMm: number;
  category: string;
  isAlias: boolean;
  active: boolean;
  visiblePOS: boolean;
  details: string | null;
};

type Props = { canEdit: boolean };

export function PhotoFormatsWorkspace({ canEdit }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/photo-formats', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const exportRows = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/photo-formats?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportGenericRowsToXlsx(d.data.rows, [...COLUMNS], 'formats-photo', 'Formats photo');
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/pricing/photo-formats', {
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

  const patch = async (id: string, body: Record<string, unknown>) => {
    const r = await fetch('/api/admin-backoffice/pricing/photo-formats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Équivalence mise à jour → sync POS');
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Formats photo — équivalences</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Table officielle POS Photo / Cadre / Photobook. Les formats commerciaux (10×15, 20×30…)
            sont facturés au format ISO (A6, A4…). Carrés : 14,5×14,5 et 29,5×29,5 cm. A2 = A4 × 4.
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
            </>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2">Affiché</th>
                <th className="p-2">Dims</th>
                <th className="p-2">Facturation</th>
                <th className="p-2">Catégorie</th>
                <th className="p-2">POS</th>
                <th className="p-2">Actif</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="p-2 font-medium">
                    {r.displayLabel}
                    {r.isAlias ? (
                      <span className="ml-2 text-xs text-muted-foreground">(alias)</span>
                    ) : null}
                  </td>
                  <td className="p-2 tabular-nums">
                    {r.widthMm}×{r.heightMm}
                  </td>
                  <td className="p-2 font-semibold text-primary">{r.billingFormat}</td>
                  <td className="p-2">{r.category}</td>
                  <td className="p-2">
                    {canEdit ? (
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void patch(r.id, { visiblePOS: !r.visiblePOS })}
                      >
                        {r.visiblePOS ? 'oui' : 'non'}
                      </button>
                    ) : (
                      r.visiblePOS ? 'oui' : 'non'
                    )}
                  </td>
                  <td className="p-2">
                    {canEdit ? (
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void patch(r.id, { active: !r.active })}
                      >
                        {r.active ? 'oui' : 'non'}
                      </button>
                    ) : (
                      r.active ? 'oui' : 'non'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
