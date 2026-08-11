'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppButton } from '@/components/ui/app-ui';

type DriftStatus =
  | 'match_ok'
  | 'prix_divergent'
  | 'prix_manquant_db'
  | 'absent_db'
  | 'sans_tarif_2026'
  | 'db_sans_ref_excel';

type DriftRow = {
  excelRowId: string;
  materialName: string;
  status: DriftStatus;
  excelPrintPrice: number | null;
  dbPrintPrice: number | null;
  message: string;
};

type DriftReport = {
  scannedAt: string;
  summary: {
    totalExcelMaterials: number;
    withExcelPrice: number;
    matchOk: number;
    prixDivergent: number;
    prixManquantDb: number;
    absentDb: number;
    sansTarif2026: number;
    servicesExact: number;
    withoutPriceListed: number;
  };
  divergences: DriftRow[];
  methodRules: { number: number; rule: string }[];
};

type ApplyReport = {
  materials: { read: number; updated: number; created: number; errors: number };
  services: { read: number; updated: number; created: number; errors: number; synced: number };
  appliedAt: string;
};

const STATUS_LABEL: Record<DriftStatus, string> = {
  match_ok: 'OK',
  prix_divergent: 'Écart prix',
  prix_manquant_db: 'Prix manquant DB',
  absent_db: 'Absent DB',
  sans_tarif_2026: 'Sans tarif 2026',
  db_sans_ref_excel: 'Hors référentiel',
};

export function Catalogue2026AuditPanel({ refreshKey }: { refreshKey?: number }) {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/catalogue-2026/audit');
      const d = await r.json();
      if (r.ok && d.ok) {
        setReport(d.data);
      } else {
        setError(d.error?.message ?? 'Audit Catalogue 2026 indisponible');
      }
    } catch {
      setError('Erreur réseau');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const applyPrices = useCallback(async () => {
    if (
      !window.confirm(
        'Appliquer les prix exacts Catalogue 2026 ?\n\n· 95 matières (upsert basePrintPrice)\n· 45 services / finitions\n\nAucune suppression — mode upsert uniquement.',
      )
    ) {
      return;
    }
    setApplying(true);
    setApplyResult(null);
    setError(null);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/catalogue-2026/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useReference: true, applyMaterials: true, applyServices: true }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        const rep = d.data as ApplyReport;
        setApplyResult(
          `Matières : ${rep.materials.updated} MAJ, ${rep.materials.created} créées (${rep.materials.errors} err.) · ` +
            `Services : ${rep.services.updated} MAJ, ${rep.services.created} créés (${rep.services.synced} sync POS)`,
        );
        await load();
      } else {
        setError(d.error?.message ?? 'Application impossible');
      }
    } catch {
      setError('Erreur réseau');
    }
    setApplying(false);
  }, [load]);

  const s = report?.summary;
  const alignmentPct =
    s && s.withExcelPrice > 0 ? Math.round((s.matchOk / s.withExcelPrice) * 100) : null;

  return (
    <div className="pta-subpanel space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="pta-subpanel-title">Catalogue 2026 — véracité prix</div>
          <p className="text-[11px] text-muted-foreground">
            Référentiel Excel auditable · recto only · pas d&apos;extrapolation
          </p>
        </div>
        {alignmentPct != null && (
          <span
            className={`acat-badge acat-badge-xs ${alignmentPct >= 90 ? 'acat-badge-active' : 'acat-badge-draft'}`}
          >
            {alignmentPct}% aligné ({s?.matchOk}/{s?.withExcelPrice})
          </span>
        )}
      </div>

      {loading && <p className="text-[11px] text-muted-foreground">Analyse référentiel…</p>}
      {error && <p className="text-[11px] text-red-600">{error}</p>}

      {s && !loading && (
        <div className="grid gap-2 text-[11px] sm:grid-cols-3">
          <div>
            <strong>{s.withExcelPrice}</strong> prix matières Excel
          </div>
          <div>
            <strong className="text-amber-600">{s.prixDivergent}</strong> écarts ·{' '}
            <strong>{s.prixManquantDb}</strong> manquants DB
          </div>
          <div>
            <strong>{s.sansTarif2026}</strong> sans tarif 2026 · <strong>{s.servicesExact}</strong> services
          </div>
        </div>
      )}

      {report && report.divergences.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px]">
          {report.divergences.slice(0, 12).map((row) => (
            <li key={`${row.excelRowId}-${row.status}`} className="flex justify-between gap-2 border-b border-border/40 py-0.5">
              <span className="truncate">
                <span className="font-mono text-muted-foreground">{row.excelRowId}</span> {row.materialName}
              </span>
              <span className="shrink-0 text-muted-foreground">{STATUS_LABEL[row.status]}</span>
            </li>
          ))}
          {report.divergences.length > 12 && (
            <li className="text-muted-foreground">+ {report.divergences.length - 12} autre(s)…</li>
          )}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <AppButton type="button" variant="ghost" size="sm" onClick={load} disabled={loading}>
          Ré-auditer
        </AppButton>
        <AppButton type="button" variant="default" size="sm" onClick={applyPrices} disabled={applying || loading}>
          {applying ? 'Application…' : 'Appliquer prix exacts 2026'}
        </AppButton>
      </div>
      {applyResult && <p className="text-[11px] text-emerald-700">{applyResult}</p>}
    </div>
  );
}
