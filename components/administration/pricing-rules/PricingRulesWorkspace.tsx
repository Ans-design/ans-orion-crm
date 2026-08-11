'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download, Upload, RefreshCw, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';
import {
  PAPER_FORMAT_EXCEL_COLUMNS,
  SUPPORT_FACE_EXCEL_COLUMNS,
} from '@/lib/backoffice/pricing-rules-excel-format';

type FormatRow = {
  id: string;
  formatCode: string;
  widthMm: number;
  heightMm: number;
  ratioA4: number;
  supplementAr: number;
  cutAr: number;
  formula: string | null;
  active: boolean;
};

type FaceRow = {
  id: string;
  supportLabel: string;
  rectoAllowed: boolean;
  versoAllowed: boolean;
  rectoVersoAllowed: boolean;
  reason: string | null;
  active: boolean;
};

type ConsistencyIssue = { code: string; severity: string; message: string };

type Props = { canEdit: boolean };

export function PricingRulesWorkspace({ canEdit }: Props) {
  const [tab, setTab] = useState<'formats' | 'faces' | 'verify'>('formats');
  const [formats, setFormats] = useState<FormatRow[]>([]);
  const [faces, setFaces] = useState<FaceRow[]>([]);
  const [issues, setIssues] = useState<ConsistencyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([
        fetch('/api/admin-backoffice/pricing/paper-formats', { cache: 'no-store' }),
        fetch('/api/admin-backoffice/pricing/support-faces', { cache: 'no-store' }),
      ]);
      const fd = await f.json();
      const sd = await s.json();
      if (!f.ok || !fd.ok) throw new Error(fd.error?.message ?? 'Formats');
      if (!s.ok || !sd.ok) throw new Error(sd.error?.message ?? 'Faces');
      setFormats(fd.data.rows ?? []);
      setFaces(sd.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const verify = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/pricing/paper-formats?action=verify');
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Vérification impossible');
      setIssues(d.data.issues ?? []);
      setTab('verify');
      uxToast.success(d.data.ok ? 'Cohérence OK' : `${(d.data.issues ?? []).length} anomalie(s)`);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const sync = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/pricing/paper-formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Sync impossible');
      uxToast.success('Règles synchronisées vers moteur POS');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur sync');
    }
  };

  const exportFormats = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/paper-formats?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportGenericRowsToXlsx(d.data.rows, PAPER_FORMAT_EXCEL_COLUMNS, 'parametres-formats-papier', 'Formats');
  };

  const exportFaces = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/support-faces?action=export');
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error('Export impossible');
      return;
    }
    exportGenericRowsToXlsx(d.data.rows, SUPPORT_FACE_EXCEL_COLUMNS, 'regles-support-faces', 'Faces');
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const url = tab === 'faces'
        ? '/api/admin-backoffice/pricing/support-faces'
        : '/api/admin-backoffice/pricing/paper-formats';
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', rows: parsed }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      uxToast.success(`Import : ${d.data.created} créé(s), ${d.data.updated} MAJ, ${d.data.errors} err`);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Import impossible');
    }
  };

  const patchFormat = async (id: string, patch: Record<string, unknown>) => {
    const r = await fetch('/api/admin-backoffice/pricing/paper-formats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(d.error?.message ?? 'MAJ impossible');
      return;
    }
    uxToast.success('Format mis à jour');
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Paramètres formats & règles support</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Formules A4 → A5/A6/A3… : A5 = A4÷2 (sans découpe) · formats &lt; A5 = +50 Ar découpe.
            Interdiction verso sur autocollants / PVC / sublimation. Sync Admin → POS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppButton type="button" onClick={() => void load()}  variant="outline" className="text-sm">
            <RefreshCw size={14} /> Actualiser
          </AppButton>
          <AppButton type="button" onClick={() => void verify()}  variant="outline" className="text-sm">
            <ShieldCheck size={14} /> Vérifier cohérence
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
                Sync POS
              </AppButton>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {([
          ['formats', 'Formats papier'],
          ['faces', 'Règles support'],
          ['verify', 'Cohérence'],
        ] as const).map(([id, label]) => (
          <AppButton
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-sm rounded-lg ${tab === id ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground hover:bg-accent'}`}
          >
            {label}
          </AppButton>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Chargement…" size="sm" />
      ) : tab === 'formats' ? (
        <div className="space-y-2">
          <AppButton type="button" variant="outline" onClick={() => void exportFormats()} className="text-xs">
            <Download size={12} /> Export formats
          </AppButton>
          <div className="overflow-x-auto rounded-[7px] border border-border">
            <table className="w-full text-sm">
              <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Format</th>
                  <th className="px-2 py-2 text-right">L mm</th>
                  <th className="px-2 py-2 text-right">H mm</th>
                  <th className="px-2 py-2 text-right">Ratio A4</th>
                  <th className="px-2 py-2 text-right">Suppl. Ar</th>
                  <th className="px-2 py-2 text-right">Découpe Ar</th>
                  <th className="px-2 py-2 text-left">Formule</th>
                </tr>
              </thead>
              <tbody>
                {formats.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-2 py-2 font-mono font-bold">{row.formatCode}</td>
                    <td className="px-2 py-2 text-right font-mono">{row.widthMm}</td>
                    <td className="px-2 py-2 text-right font-mono">{row.heightMm}</td>
                    <td className="px-2 py-2 text-right font-mono">{row.ratioA4}</td>
                    <td className="px-2 py-2 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          defaultValue={row.supplementAr}
                          className="w-20 text-right rounded border border-border px-1 py-0.5 text-xs"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== row.supplementAr) void patchFormat(row.id, { supplementAr: v });
                          }}
                        />
                      ) : row.supplementAr}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          defaultValue={row.cutAr}
                          className="w-20 text-right rounded border border-border px-1 py-0.5 text-xs"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== row.cutAr) void patchFormat(row.id, { cutAr: v });
                          }}
                        />
                      ) : row.cutAr}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{row.formula ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'faces' ? (
        <div className="space-y-2">
          <AppButton type="button" onClick={() => void exportFaces()}  variant="outline" className="text-xs">
            <Download size={12} /> Export supports
          </AppButton>
          <div className="overflow-x-auto rounded-[7px] border border-border">
            <table className="w-full text-sm">
              <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Support</th>
                  <th className="px-2 py-2 text-center">Recto</th>
                  <th className="px-2 py-2 text-center">Verso</th>
                  <th className="px-2 py-2 text-center">R/V</th>
                  <th className="px-2 py-2 text-left">Raison</th>
                </tr>
              </thead>
              <tbody>
                {faces.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-2 py-2 font-medium">{row.supportLabel}</td>
                    <td className="px-2 py-2 text-center">{row.rectoAllowed ? 'oui' : 'non'}</td>
                    <td className="px-2 py-2 text-center">{row.versoAllowed ? 'oui' : 'non'}</td>
                    <td className="px-2 py-2 text-center font-bold">
                      {row.rectoVersoAllowed ? (
                        <span className="text-[#10B981]">oui</span>
                      ) : (
                        <span className="text-amber-700">non</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{row.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.length === 0 ? (
            <p className="text-sm text-[#10B981] font-semibold">Aucune anomalie — lancez « Vérifier cohérence ».</p>
          ) : (
            <ul className="space-y-2">
              {issues.map((issue) => (
                <li
                  key={issue.code + issue.message}
                  className={`rounded-lg border px-3 py-2 text-sm flex gap-2 ${
                    issue.severity === 'error'
                      ? 'border-red-500/40 bg-red-500/10 text-red-800'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-900'
                  }`}
                >
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span><strong>{issue.code}</strong> — {issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
