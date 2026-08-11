'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Upload, RefreshCw, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportMultiSheetXlsx, parseMultiSheetXlsx } from '@/lib/admin/excel-table';
import {
  PUBLICATION_REGLES_EXCEL_COLUMNS,
  PUBLICATION_PALIERS_EXCEL_COLUMNS,
} from '@/lib/pricing/publication-pricing-rules';

type VolumeTier = { minQty: number; rate: number };

type Params = {
  fallbackPuNoirA4: number;
  fallbackPuQuadriA4: number;
  fallbackCoverPrintAr: number;
  coverRigidSupplementAr: number;
  pelliculageCouvertureA4: number;
  blocColleAr: number;
  coinsParExemplaire: number;
  utilisePalier: boolean;
  allowFallbackPrint: boolean;
  sourcePrixImpression: string;
  sourcePrixReliure: string;
  commentaire: string;
  volumeTiers: VolumeTier[];
};

type Props = { canEdit: boolean };

export function PublicationPricingWorkspace({ canEdit }: Props) {
  const [params, setParams] = useState<Params | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/publications-regles', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
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
    const r = await fetch('/api/admin-backoffice/pricing/publications-regles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Règles publications mises à jour');
    void load();
  };

  const exportRows = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/publications-regles?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportMultiSheetXlsx(
      [
        {
          name: '01_PUBLICATIONS_REGLES',
          columns: PUBLICATION_REGLES_EXCEL_COLUMNS,
          rows: (d.data.sheets?.['01_PUBLICATIONS_REGLES'] ?? []) as Record<string, unknown>[],
        },
        {
          name: '02_PUBLICATIONS_PALIERS',
          columns: PUBLICATION_PALIERS_EXCEL_COLUMNS,
          rows: (d.data.sheets?.['02_PUBLICATIONS_PALIERS'] ?? []) as Record<string, unknown>[],
        },
      ],
      'publications-regles-prix',
    );
  };

  const importFile = async (file: File) => {
    try {
      const sheets = await parseMultiSheetXlsx(file);
      const names = Object.keys(sheets);
      const rulesKey =
        names.find((n) => /regles|règles|01_/i.test(n))
        ?? names[0];
      const paliersKey = names.find((n) => /palier|02_/i.test(n));
      const r = await fetch('/api/admin-backoffice/pricing/publications-regles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          rulesRows: rulesKey ? sheets[rulesKey] ?? [] : [],
          paliersRows: paliersKey ? sheets[paliersKey] ?? [] : [],
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      uxToast.success('Import publications OK (règles + paliers)');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Import impossible');
    }
  };

  if (loading || !params) {
    return <LoadingState message="Chargement…" size="sm" />;
  }

  const tiers = params.volumeTiers ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Livres, bloc-notes, agendas & calendriers</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Formule : <strong>ISF × pages</strong> + couverture + reliure (1× / exemplaire) + finitions − remise.
            Les grilles d’impression restent dans Impression sans finition ; reliures dans Finitions & Reliures.
            Les montants ci-dessous sont des fallbacks Admin modifiables / exportables.
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
                  await fetch('/api/admin-backoffice/pricing/publications-regles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sync' }),
                  });
                  uxToast.success('Sync runtime publications');
                  void load();
                }}
              >
                <ShieldCheck size={14} /> Sync POS
              </AppButton>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            ['fallbackPuNoirA4', 'Fallback PU noir A4', params.fallbackPuNoirA4],
            ['fallbackPuQuadriA4', 'Fallback PU quadri A4', params.fallbackPuQuadriA4],
            ['fallbackCoverPrintAr', 'Fallback impression couv.', params.fallbackCoverPrintAr],
            ['coverRigidSupplementAr', 'Supplément couv. rigide', params.coverRigidSupplementAr],
            ['pelliculageCouvertureA4', 'Pelliculage couv. A4', params.pelliculageCouvertureA4],
            ['blocColleAr', 'Bloc collé / ex.', params.blocColleAr],
            ['coinsParExemplaire', 'Coins / exemplaire', params.coinsParExemplaire],
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
          <label className="text-xs space-y-1 flex flex-col justify-end">
            <span className="text-muted-foreground uppercase tracking-wide">Utilise palier</span>
            <AppButton type="button"
              disabled={!canEdit}
              variant={params.utilisePalier  ? 'default' : 'outline'} className="text-sm"
              onClick={() => void patch({ utilisePalier: !params.utilisePalier })}
            >
              {params.utilisePalier ? 'Oui' : 'Non'}
            </AppButton>
          </label>
          <label className="text-xs space-y-1 flex flex-col justify-end">
            <span className="text-muted-foreground uppercase tracking-wide">Fallback print</span>
            <AppButton type="button"
              disabled={!canEdit}
              variant={params.allowFallbackPrint  ? 'default' : 'outline'} className="text-sm"
              onClick={() => void patch({ allowFallbackPrint: !params.allowFallbackPrint })}
            >
              {params.allowFallbackPrint ? 'Oui' : 'Non'}
            </AppButton>
          </label>
          <div className="text-xs space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-muted-foreground uppercase tracking-wide">Sources</span>
            <p className="text-sm">
              Impression : {params.sourcePrixImpression} · Reliure : {params.sourcePrixReliure}
            </p>
            <p className="text-muted-foreground">{params.commentaire}</p>
          </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Paliers remise (qty min → taux)</h2>
          {canEdit && (
            <AppButton type="button" variant="outline" className="text-xs" onClick={() => {
                const next = [...tiers, { minQty: 10, rate: 0.01 }];
                void patch({ volumeTiers: next });
              }}
            >
              <Plus size={14} /> Ajouter palier
            </AppButton>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="text-left py-1">Qty min</th>
              <th className="text-left py-1">Taux</th>
              {canEdit && (
                <th className="w-10">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={`${t.minQty}-${i}`} className="border-t border-border">
                <td className="py-1.5">
                  {canEdit ? (
                    <input
                      type="number"
                      defaultValue={t.minQty}
                      className="w-24 rounded border border-border px-1 py-0.5 text-xs"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v === t.minQty) return;
                        const next = tiers.map((x, j) => (j === i ? { ...x, minQty: v } : x));
                        void patch({ volumeTiers: next });
                      }}
                    />
                  ) : (
                    t.minQty
                  )}
                </td>
                <td className="py-1.5">
                  {canEdit ? (
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={t.rate}
                      className="w-24 rounded border border-border px-1 py-0.5 text-xs"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v === t.rate) return;
                        const next = tiers.map((x, j) => (j === i ? { ...x, rate: v } : x));
                        void patch({ volumeTiers: next });
                      }}
                    />
                  ) : (
                    `${Math.round(t.rate * 100)} %`
                  )}
                </td>
                {canEdit && (
                  <td>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer palier"
                      onClick={() => {
                        const next = tiers.filter((_, j) => j !== i);
                        void patch({ volumeTiers: next });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
