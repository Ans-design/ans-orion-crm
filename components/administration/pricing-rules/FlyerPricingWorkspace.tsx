'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Upload, RefreshCw, ShieldCheck } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';
import { FLYER_REGLES_EXCEL_COLUMNS } from '@/lib/pricing/flyer-pricing-rules';

type RuleRow = {
  id: string;
  article: string;
  sourcePrixBase: string;
  typeCalcul: string;
  nombreVolets: string;
  nombrePlis: number;
  prixPliA4: number;
  coefficientFormat: string;
  utilisePalier: boolean;
  visiblePos: boolean;
  actif: boolean;
  statut: string;
  commentaire: string;
};

type Params = {
  prixPliA4: number;
  utilisePalier: boolean;
  visiblePos: boolean;
  actif: boolean;
  sourcePrixBase: string;
  commentaire: string;
};

type Props = { canEdit: boolean };

export function FlyerPricingWorkspace({ canEdit }: Props) {
  const [rows, setRows] = useState<RuleRow[]>([]);
  const [params, setParams] = useState<Params | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/flyer-regles', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data.rows ?? []);
      setParams(d.data.params ?? null);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    const r = await fetch('/api/admin-backoffice/pricing/flyer-regles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Règles Flyer mises à jour (pliage + sync rainage)');
    void load();
  };

  const exportRows = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/flyer-regles?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportGenericRowsToXlsx(
      d.data.rows,
      [...FLYER_REGLES_EXCEL_COLUMNS],
      'FLYER_REGLES_PRIX',
      'FLYER_REGLES_PRIX',
    );
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/pricing/flyer-regles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', rows: parsed }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      uxToast.success('Import FLYER_REGLES_PRIX OK');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Import impossible');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Flyers — règles de prix</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Formule : <strong>Impression sans finition</strong> (format × matière × grammage × face × qty)
            + <strong>pliage</strong> (nb plis × prix pli A4 × coeff format) − remise palier ISF.
            Les grilles matière/format restent dans Impression sans finition ; le prix pli A4 suit
            Finitions & Reliures (rainage).
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
            <Link href="/administration/catalogue-prix-stock?tab=isf" className="underline">
              → Impression sans finition
            </Link>
            <Link href="/administration/finitions-reliures" className="underline">
              → Finitions & Reliures (rainage)
            </Link>
            <Link href="/administration/catalogue-prix-stock?tab=paliers" className="underline">
              → Paliers & remises
            </Link>
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
                  await fetch('/api/admin-backoffice/pricing/flyer-regles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sync' }),
                  });
                  uxToast.success('Sync runtime Flyer');
                  void load();
                }}
              >
                <ShieldCheck size={14} /> Sync POS
              </AppButton>
            </>
          )}
        </div>
      </div>

      {params && (
        <div className="rounded-lg border border-border bg-card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground uppercase tracking-wide">Prix pli A4 (Ar)</span>
            {canEdit ? (
              <input
                type="number"
                defaultValue={params.prixPliA4}
                className="w-full rounded border border-border px-2 py-1.5 text-sm"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v !== params.prixPliA4 && v > 0) void patch({ prixPliA4: v });
                }}
              />
            ) : (
              <p className="text-sm font-medium">{params.prixPliA4} Ar</p>
            )}
          </label>
          <label className="text-xs space-y-1 flex flex-col justify-end">
            <span className="text-muted-foreground uppercase tracking-wide">Utilise palier ISF</span>
            <AppButton type="button"
              disabled={!canEdit}
              variant={params.utilisePalier  ? 'default' : 'outline'} className="text-sm"
              onClick={() => void patch({ utilisePalier: !params.utilisePalier })}
            >
              {params.utilisePalier ? 'Oui' : 'Non'}
            </AppButton>
          </label>
          <label className="text-xs space-y-1 flex flex-col justify-end">
            <span className="text-muted-foreground uppercase tracking-wide">Visible POS</span>
            <AppButton type="button"
              disabled={!canEdit}
              variant={params.visiblePos  ? 'default' : 'outline'} className="text-sm"
              onClick={() => void patch({ visiblePos: !params.visiblePos })}
            >
              {params.visiblePos ? 'Oui' : 'Non'}
            </AppButton>
          </label>
          <label className="text-xs space-y-1 flex flex-col justify-end">
            <span className="text-muted-foreground uppercase tracking-wide">Actif</span>
            <AppButton type="button"
              disabled={!canEdit}
              variant={params.actif  ? 'default' : 'outline'} className="text-sm"
              onClick={() => void patch({ actif: !params.actif })}
            >
              {params.actif ? 'Oui' : 'Non'}
            </AppButton>
          </label>
          <div className="text-xs space-y-1 sm:col-span-2">
            <span className="text-muted-foreground uppercase tracking-wide">Source prix base</span>
            <p className="text-sm font-medium">{params.sourcePrixBase}</p>
            <p className="text-muted-foreground leading-snug">{params.commentaire}</p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState message="Chargement…" size="sm" />
      ) : (
        <div className="overflow-x-auto rounded-[7px] border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">Volets</th>
                <th className="px-2 py-2 text-right">Plis</th>
                <th className="px-2 py-2 text-right">Prix pli A4</th>
                <th className="px-2 py-2 text-left">Coeff format</th>
                <th className="px-2 py-2 text-left">Statut</th>
                <th className="px-2 py-2 text-left">Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-2 font-mono text-xs">{row.id}</td>
                  <td className="px-2 py-2 font-medium">{row.nombreVolets}</td>
                  <td className="px-2 py-2 text-right">
                    {row.nombrePlis < 0 ? '—' : row.nombrePlis}
                  </td>
                  <td className="px-2 py-2 text-right">{row.prixPliA4}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{row.coefficientFormat}</td>
                  <td className="px-2 py-2 text-xs">{row.statut}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{row.commentaire}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
