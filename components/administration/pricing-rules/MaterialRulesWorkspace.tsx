'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';
import {
  MATERIAL_EQUIV_EXCEL_COLUMNS,
  THICK_PAPER_EXCEL_COLUMNS,
  BLANK_MATERIAL_EXCEL_COLUMNS,
} from '@/lib/backoffice/pricing-rules-excel-format';

type Kind = 'equivalences' | 'thick-paper' | 'blank-materials';

type Props = { canEdit: boolean; initialKind?: Kind };

export function MaterialRulesWorkspace({ canEdit, initialKind = 'equivalences' }: Props) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin-backoffice/pricing/material-rules?kind=${kind}`, {
        cache: 'no-store',
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns =
    kind === 'thick-paper'
      ? THICK_PAPER_EXCEL_COLUMNS
      : kind === 'blank-materials'
        ? BLANK_MATERIAL_EXCEL_COLUMNS
        : MATERIAL_EQUIV_EXCEL_COLUMNS;

  const exportRows = () => {
    const stem =
      kind === 'thick-paper'
        ? 'regles-papier-epais'
        : kind === 'blank-materials'
          ? 'matieres-vierges'
          : 'equivalences-matieres';
    exportGenericRowsToXlsx(rows, [...columns], stem, kind);
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch(`/api/admin-backoffice/pricing/material-rules?kind=${kind}`, {
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

  const patch = async (id: string, patchBody: Record<string, unknown>) => {
    const r = await fetch(`/api/admin-backoffice/pricing/material-rules?kind=${kind}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patchBody }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Mis à jour');
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Équivalences & matières</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Équivalences prix (offset 90G = 80G+20…), règles grammage épais, matières vierges (achat).
            Collage contre-collé = finition séparée.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppButton type="button" onClick={() => void load()}  variant="outline" className="text-sm">
            <RefreshCw size={14} /> Actualiser
          </AppButton>
          <AppButton type="button" onClick={exportRows} variant="outline" className="text-sm">
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

      <div className="flex gap-2 border-b border-border pb-2">
        {([
          ['equivalences', 'Équivalences'],
          ['thick-paper', 'Papier épais'],
          ['blank-materials', 'Matières vierges'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              kind === id ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Chargement…" size="sm" />
      ) : (
        <div className="overflow-x-auto rounded-[7px] border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
              <tr>
                {kind === 'equivalences' && (
                  <>
                    <th className="px-2 py-2 text-left">Matière</th>
                    <th className="px-2 py-2 text-left">Réf.</th>
                    <th className="px-2 py-2 text-right">Suppl. Ar</th>
                    <th className="px-2 py-2 text-center">Prix identique</th>
                  </>
                )}
                {kind === 'thick-paper' && (
                  <>
                    <th className="px-2 py-2 text-left">Support</th>
                    <th className="px-2 py-2 text-right">G min</th>
                    <th className="px-2 py-2 text-right">G max</th>
                    <th className="px-2 py-2 text-left">Formule</th>
                    <th className="px-2 py-2 text-right">Suppl. Ar</th>
                  </>
                )}
                {kind === 'blank-materials' && (
                  <>
                    <th className="px-2 py-2 text-left">Nom</th>
                    <th className="px-2 py-2 text-left">Grammage</th>
                    <th className="px-2 py-2 text-right">Prix achat</th>
                    <th className="px-2 py-2 text-left">Unité</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = String(row.id ?? '');
                if (kind === 'equivalences') {
                  return (
                    <tr key={id} className="border-t border-border">
                      <td className="px-2 py-2">{String(row.materialLabel ?? row.materialKey ?? '')}</td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {String(row.referenceMaterial ?? '')} {String(row.referenceGrammage ?? '')}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {canEdit ? (
                          <input
                            type="number"
                            defaultValue={Number(row.supplementAr) || 0}
                            className="w-20 text-right rounded border border-border px-1 py-0.5 text-xs"
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== Number(row.supplementAr)) void patch(id, { supplementAr: v });
                            }}
                          />
                        ) : (
                          Number(row.supplementAr) || 0
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">{row.identicalPrice ? 'oui' : 'non'}</td>
                    </tr>
                  );
                }
                if (kind === 'thick-paper') {
                  return (
                    <tr key={id} className="border-t border-border">
                      <td className="px-2 py-2">{String(row.supportType ?? '')}</td>
                      <td className="px-2 py-2 text-right font-mono">{Number(row.grammageMin)}</td>
                      <td className="px-2 py-2 text-right font-mono">
                        {row.grammageMax == null ? '∞' : Number(row.grammageMax)}
                      </td>
                      <td className="px-2 py-2 text-xs">{String(row.formula ?? '')}</td>
                      <td className="px-2 py-2 text-right">
                        {canEdit ? (
                          <input
                            type="number"
                            defaultValue={Number(row.supplementAr) || 0}
                            className="w-20 text-right rounded border border-border px-1 py-0.5 text-xs"
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== Number(row.supplementAr)) void patch(id, { supplementAr: v });
                            }}
                          />
                        ) : (
                          Number(row.supplementAr) || 0
                        )}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={id} className="border-t border-border">
                    <td className="px-2 py-2">{String(row.name ?? '')}</td>
                    <td className="px-2 py-2">{String(row.grammage ?? '—')}</td>
                    <td className="px-2 py-2 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          defaultValue={Number(row.purchasePrice) || 0}
                          className="w-24 text-right rounded border border-border px-1 py-0.5 text-xs"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== Number(row.purchasePrice)) void patch(id, { purchasePrice: v });
                          }}
                        />
                      ) : (
                        Number(row.purchasePrice) || 0
                      )}
                    </td>
                    <td className="px-2 py-2">{String(row.purchaseUnit ?? '')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <p className="p-6 text-sm text-muted-foreground text-center">Aucune ligne — seed au premier chargement.</p>
          )}
        </div>
      )}
    </div>
  );
}
