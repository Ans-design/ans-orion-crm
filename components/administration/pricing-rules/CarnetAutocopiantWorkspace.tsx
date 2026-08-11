'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw, ShieldCheck } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';

const CARNET_EXCEL_COLUMNS = [
  'ID', 'ARTICLE', 'PRIX A4 N&B', 'PRIX A4 QUADRI', 'NUMÉROTATION AR/PAGE',
  'RELIURE AR', 'PERFORATION AR/A4', 'COUVERTURE 300G A3 RECTO', 'PERTE DÉCHET %',
  'ACTIF', 'VISIBLE POS', 'DÉTAIL',
] as const;
type Row = {
  id: string;
  code: string;
  label: string;
  prixA4Nb: number;
  prixA4Quadri: number;
  numerotationArPerPage: number;
  reliureAr: number;
  perforationArPerA4: number;
  couverture300gA3RectoAr: number;
  wastePct: number;
  active: boolean;
  visiblePOS: boolean;
  details: string | null;
};

type Props = { canEdit: boolean };

export function CarnetAutocopiantWorkspace({ canEdit }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/carnet-autocopiant', { cache: 'no-store' });
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
    const r = await fetch('/api/admin-backoffice/pricing/carnet-autocopiant', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Paramètres carnet mis à jour → sync POS');
    void load();
  };

  const exportRows = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/carnet-autocopiant?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportGenericRowsToXlsx(d.data.rows, [...CARNET_EXCEL_COLUMNS], 'carnet-autocopiant', 'Carnet');
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/pricing/carnet-autocopiant', {
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
          <h1 className="text-xl font-display font-bold">Carnet autocopiant / Facturier</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Formule : papier×facteur×feuillets + numérotation + couverture 300G A3 + reliure + perforation + perte %.
            Formats = règles Impression sans finition. Tous les montants sont modifiables ici / Excel.
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
                  await fetch('/api/admin-backoffice/pricing/carnet-autocopiant', {
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
                <th className="px-2 py-2 text-left">Article</th>
                <th className="px-2 py-2 text-right">A4 N&B</th>
                <th className="px-2 py-2 text-right">A4 Quadri</th>
                <th className="px-2 py-2 text-right">Numérot./page</th>
                <th className="px-2 py-2 text-right">Reliure</th>
                <th className="px-2 py-2 text-right">Perf./A4</th>
                <th className="px-2 py-2 text-right">Couv. 300G A3</th>
                <th className="px-2 py-2 text-right">Perte %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-2 font-medium">{row.label}</td>
                  {(
                    [
                      ['prixA4Nb', row.prixA4Nb],
                      ['prixA4Quadri', row.prixA4Quadri],
                      ['numerotationArPerPage', row.numerotationArPerPage],
                      ['reliureAr', row.reliureAr],
                      ['perforationArPerA4', row.perforationArPerA4],
                      ['couverture300gA3RectoAr', row.couverture300gA3RectoAr],
                      ['wastePct', row.wastePct],
                    ] as const
                  ).map(([key, val]) => (
                    <td key={key} className="px-2 py-2 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          defaultValue={val}
                          className="w-24 text-right rounded border border-border px-1 py-0.5 text-xs"
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
