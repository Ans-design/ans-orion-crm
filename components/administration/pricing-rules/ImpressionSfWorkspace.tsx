'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Upload, RefreshCw, ShieldCheck, ExternalLink } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';
import { BASE_PRINTING_EXCEL_COLUMNS } from '@/lib/backoffice/pricing-rules-excel-format';
import { BasePrintingPriceTable } from '@/components/backoffice-v2/pricing-custom/BasePrintingPriceTable';

type Props = { canEdit: boolean };

export function ImpressionSfWorkspace({ canEdit }: Props) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    void fetch('/api/admin-backoffice/pricing/paper-formats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seed' }),
    }).catch(() => undefined);
  }, []);

  const exportExcel = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/base-printing?action=export', {
        cache: 'no-store',
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Export impossible');
      exportGenericRowsToXlsx(
        d.data.rows ?? [],
        [...BASE_PRINTING_EXCEL_COLUMNS],
        'impression-sans-finition',
        'ISF',
      );
      uxToast.success('Export Excel prêt');
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setBusy(false);
    }
  };

  const importExcel = async (file: File) => {
    setBusy(true);
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/pricing/base-printing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', rows: parsed }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
      uxToast.success(
        `Import ISF : ${d.data.created ?? 0} créé(s), ${d.data.updated ?? 0} MAJ, ${d.data.errors ?? 0} err`,
      );
      reload();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Import impossible');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/pricing/paper-formats?action=verify');
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Vérification impossible');
      const n = (d.data.issues ?? []).length;
      if (d.data.ok) uxToast.success('Cohérence prix OK');
      else uxToast.error(`${n} anomalie(s) — voir Paramètres formats`);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Impression sans finition</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Prix A4 base par matière/grammage — formules formats et règles recto/verso dans{' '}
            <Link href="/administration/parametres-formats-papier" className="text-primary underline">
              Paramètres formats papier
            </Link>
            . Publication Admin → sync POS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppButton type="button" onClick={reload} variant="outline" className="text-sm" disabled={busy}>
            <RefreshCw size={14} /> Actualiser
          </AppButton>
          <AppButton type="button" onClick={() => void verify()}  variant="outline" className="text-sm">
            <ShieldCheck size={14} /> Vérifier cohérence
          </AppButton>
          <AppButton type="button" onClick={() => void exportExcel()}  variant="outline" className="text-sm" disabled={busy}>
            <Download size={14} /> Export Excel
          </AppButton>
          {canEdit && (
            <>
              <AppButton
                type="button"
                onClick={() => fileRef.current?.click()}
                 variant="default" className="text-sm"
                disabled={busy}
              >
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
          <AppButton variant="outline" className="text-sm inline-flex items-center gap-1" asChild>
              <Link
            href="/administration/parametres-formats-papier"
            
          >
            <ExternalLink size={14} /> Formats & faces
          </Link>
            </AppButton>
        </div>
      </div>

      <div key={refreshKey}>
        <BasePrintingPriceTable canEdit={canEdit} />
      </div>
    </div>
  );
}
