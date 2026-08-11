'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw, ShieldCheck } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';
import {
  PRINT_TECH_EXCEL_COLUMNS,
  SERVICE_EQUIV_EXCEL_COLUMNS,
} from '@/lib/backoffice/pricing-rules-excel-format';

type TechRow = {
  id: string;
  ruleCode: string;
  supportScope: string;
  printType: string;
  technology: string;
  supplementAr: number;
  active: boolean;
  details: string | null;
};

type SvcRow = {
  id: string;
  serviceLabel: string;
  equivalentLabel: string;
  priceRule: string;
  active: boolean;
  details: string | null;
};

type Props = { canEdit: boolean };

export function PrintParamsWorkspace({ canEdit }: Props) {
  const [tab, setTab] = useState<'tech' | 'services'>('tech');
  const [tech, setTech] = useState<TechRow[]>([]);
  const [services, setServices] = useState<SvcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        fetch('/api/admin-backoffice/pricing/print-params?kind=tech', { cache: 'no-store' }),
        fetch('/api/admin-backoffice/pricing/print-params?kind=services', { cache: 'no-store' }),
      ]);
      const td = await t.json();
      const sd = await s.json();
      if (!t.ok || !td.ok) throw new Error(td.error?.message ?? 'Tech');
      if (!s.ok || !sd.ok) throw new Error(sd.error?.message ?? 'Services');
      setTech(td.data.rows ?? []);
      setServices(sd.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/pricing/print-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Sync impossible');
      uxToast.success('Paramètres impression synchronisés → POS');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur sync');
    }
  };

  const exportRows = async () => {
    const kind = tab === 'tech' ? 'tech' : 'services';
    const r = await fetch(`/api/admin-backoffice/pricing/print-params?kind=${kind}&action=export`);
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportGenericRowsToXlsx(
      d.data.rows,
      tab === 'tech' ? [...PRINT_TECH_EXCEL_COLUMNS] : [...SERVICE_EQUIV_EXCEL_COLUMNS],
      tab === 'tech' ? 'parametres-impression-tech' : 'equivalences-services',
      tab,
    );
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const kind = tab === 'tech' ? 'tech' : 'services';
      const r = await fetch(`/api/admin-backoffice/pricing/print-params?kind=${kind}`, {
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

  const patchTech = async (id: string, supplementAr: number) => {
    const r = await fetch('/api/admin-backoffice/pricing/print-params?kind=tech', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, supplementAr }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Supplément mis à jour + sync POS');
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Paramètres impression</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Supplément Laser Quadri (offset), équivalence Impression = Photocopie.
            Offset : NB ≠ Quadri ; hors offset : même prix tous types.
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
              <AppButton type="button" onClick={() => void sync()}  variant="default" className="text-sm">
                <ShieldCheck size={14} /> Sync POS
              </AppButton>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {([
          ['tech', 'Techno / suppléments'],
          ['services', 'Équivalences services'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              tab === id ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Chargement…" size="sm" />
      ) : tab === 'tech' ? (
        <div className="overflow-x-auto rounded-[7px] border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Règle</th>
                <th className="px-2 py-2 text-left">Support</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Techno</th>
                <th className="px-2 py-2 text-right">Suppl. Ar</th>
                <th className="px-2 py-2 text-left">Détail</th>
              </tr>
            </thead>
            <tbody>
              {tech.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-2 font-mono font-bold">{row.ruleCode}</td>
                  <td className="px-2 py-2">{row.supportScope}</td>
                  <td className="px-2 py-2">{row.printType}</td>
                  <td className="px-2 py-2">{row.technology}</td>
                  <td className="px-2 py-2 text-right">
                    {canEdit ? (
                      <input
                        type="number"
                        defaultValue={row.supplementAr}
                        className="w-24 text-right rounded border border-border px-1 py-0.5 text-xs"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== row.supplementAr) void patchTech(row.id, v);
                        }}
                      />
                    ) : (
                      row.supplementAr
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{row.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[7px] border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Service</th>
                <th className="px-2 py-2 text-left">Équivalent</th>
                <th className="px-2 py-2 text-left">Règle prix</th>
                <th className="px-2 py-2 text-left">Détail</th>
              </tr>
            </thead>
            <tbody>
              {services.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-2 font-medium">{row.serviceLabel}</td>
                  <td className="px-2 py-2">{row.equivalentLabel}</td>
                  <td className="px-2 py-2 font-mono text-xs">{row.priceRule}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{row.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
