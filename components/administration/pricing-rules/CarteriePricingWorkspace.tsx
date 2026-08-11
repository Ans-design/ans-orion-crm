'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Upload, RefreshCw, ShieldCheck } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportMultiSheetXlsx, parseMultiSheetXlsx } from '@/lib/admin/excel-table';
import {
  CARTERIE_IMPOSITION_EXCEL_COLUMNS,
  CARTERIE_REGLES_EXCEL_COLUMNS,
} from '@/lib/pricing/carterie-pricing-rules';

type ImpRow = {
  id: string;
  formatFini: string;
  largeurMm: number;
  hauteurMm: number;
  formatFeuilleBase: string;
  piecesParFeuille: number;
  actif: boolean;
  commentaire: string;
};

type Params = {
  pelliculageA4: number;
  gaufrageA4: number;
  dorureA4?: number;
  vernisA4?: number;
  prixDecoupeParPiece: number;
  coinsParFeuille: number;
  utilisePalier: boolean;
  sourcePrixBase: string;
  commentaire: string;
};

type Props = { canEdit: boolean };

export function CarteriePricingWorkspace({ canEdit }: Props) {
  const [imposition, setImposition] = useState<ImpRow[]>([]);
  const [params, setParams] = useState<Params | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/carterie-regles', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setImposition(d.data.imposition ?? []);
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
    const r = await fetch('/api/admin-backoffice/pricing/carterie-regles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Règles Carterie mises à jour');
    void load();
  };

  const exportRows = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/carterie-regles?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    const imp = (d.data.sheets?.['02_CARTERIE_FORMATS_IMPOSITION'] ?? []) as Record<string, unknown>[];
    const rules = (d.data.sheets?.['05_CARTERIE_REGLES_PRIX'] ?? []) as Record<string, unknown>[];
    exportMultiSheetXlsx(
      [
        {
          name: '02_CARTERIE_FORMATS_IMPOSITION',
          columns: CARTERIE_IMPOSITION_EXCEL_COLUMNS,
          rows: imp,
        },
        {
          name: '05_CARTERIE_REGLES_PRIX',
          columns: CARTERIE_REGLES_EXCEL_COLUMNS,
          rows: rules,
        },
      ],
      'carterie-regles-prix',
    );
  };

  const importFile = async (file: File) => {
    try {
      const sheets = await parseMultiSheetXlsx(file);
      const names = Object.keys(sheets);
      const impKey =
        names.find((n) => /imposition|format/i.test(n))
        ?? names.find((n) => /02_/.test(n))
        ?? names[0];
      const rulesKey =
        names.find((n) => /regles|règles|rules|prix/i.test(n) && !/imposition|format/i.test(n))
        ?? names.find((n) => /05_/.test(n));
      const impositionRows = impKey ? sheets[impKey] ?? [] : [];
      const rulesRows = rulesKey ? sheets[rulesKey] ?? [] : [];
      const r = await fetch('/api/admin-backoffice/pricing/carterie-regles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', impositionRows, rulesRows }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      uxToast.success('Import Carterie OK (imposition + règles)');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Import impossible');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Carterie — imposition & prix</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Formule : <strong>(Impression sans finition feuille + finitions feuille) ÷ pièces</strong>
            + découpe / pièce. Les grilles matière restent dans Impression sans finition ; pelliculage /
            gaufrage / découpe dans Finitions & Reliures.
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
            <Link href="/administration/catalogue-prix-stock?tab=isf" className="underline">
              → Impression sans finition
            </Link>
            <Link href="/administration/finitions-reliures" className="underline">
              → Finitions & Reliures
            </Link>
            <Link href="/administration/catalogue-prix-stock?tab=paliers" className="underline">
              → Paliers
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
                  await fetch('/api/admin-backoffice/pricing/carterie-regles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sync' }),
                  });
                  uxToast.success('Sync runtime Carterie');
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
          {(
            [
              ['pelliculageA4', 'Pelliculage A4', params.pelliculageA4],
              ['gaufrageA4', 'Gaufrage A4', params.gaufrageA4],
              ['dorureA4', 'Dorure A4', params.dorureA4 ?? 0],
              ['vernisA4', 'Vernis A4', params.vernisA4 ?? 0],
              ['prixDecoupeParPiece', 'Découpe / pièce', params.prixDecoupeParPiece],
              ['coinsParFeuille', 'Coins / feuille', params.coinsParFeuille],
            ] as const
          ).map(([key, label, val]) => (
            <label key={key} className="text-xs space-y-1">
              <span className="text-muted-foreground uppercase tracking-wide">{label}</span>
              {canEdit ? (
                <input
                  type="number"
                  defaultValue={val}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== val && v >= 0) void patch({ [key]: v });
                  }}
                />
              ) : (
                <p className="text-sm font-medium">{val} Ar</p>
              )}
            </label>
          ))}
          <div className="text-xs space-y-1 sm:col-span-2 lg:col-span-4">
            <span className="text-muted-foreground uppercase tracking-wide">Source</span>
            <p className="text-sm font-medium">{params.sourcePrixBase}</p>
            <p className="text-muted-foreground">{params.commentaire}</p>
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
                <th className="px-2 py-2 text-left">Format fini</th>
                <th className="px-2 py-2 text-right">L × H mm</th>
                <th className="px-2 py-2 text-left">Feuille</th>
                <th className="px-2 py-2 text-right">Pièces / feuille</th>
                <th className="px-2 py-2 text-left">Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {imposition.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-2 font-medium">{row.formatFini}</td>
                  <td className="px-2 py-2 text-right text-xs">
                    {row.largeurMm > 0 ? `${row.largeurMm}×${row.hauteurMm}` : '—'}
                  </td>
                  <td className="px-2 py-2">{row.formatFeuilleBase}</td>
                  <td className="px-2 py-2 text-right">
                    {canEdit ? (
                      <input
                        type="number"
                        defaultValue={row.piecesParFeuille}
                        className="w-20 text-right rounded border border-border px-1 py-0.5 text-xs"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== row.piecesParFeuille && v >= 0) {
                            void patch({ formatFini: row.formatFini, piecesParFeuille: v });
                          }
                        }}
                      />
                    ) : (
                      row.piecesParFeuille || '—'
                    )}
                  </td>
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
