'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { OptionsLoadingState } from '../options/OptionsLoadingState';

type FormulaAudit = {
  articleId: string;
  articleLabel: string;
  formulaVersion: number | null;
  formulaStatus: string | null;
  usesPrix2026: boolean;
  usesMaterialsDb: boolean;
  priceImpactVariables: string[];
  indicativeVariables: string[];
  anomalies: string[];
};

type Props = { articleId: string };

export function FormulaAuditPanel({ articleId }: Props) {
  const [audit, setAudit] = useState<FormulaAudit | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin-backoffice/pricing/articles/${encodeURIComponent(articleId)}/formula-audit`, {
        cache: 'no-store',
      });
      const d = await r.json();
      if (r.ok && d.ok) setAudit(d.data.formulaAudit ?? null);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <OptionsLoadingState variant="table" rows={4} />;
  if (!audit) return <p className="text-sm text-muted-foreground">Aucun profil tarification pour cet article.</p>;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h4 className="font-medium">Audit formule — {audit.articleLabel}</h4>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>Formule : v{audit.formulaVersion ?? '—'} ({audit.formulaStatus ?? 'none'})</div>
        <div className="flex items-center gap-2">
          {audit.usesPrix2026 ? (
            <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" /> Utilise PRIX 2026</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Sans PRIX 2026</span>
          )}
        </div>
        <div>
          Matières DB : {audit.usesMaterialsDb ? 'Oui' : 'Non'}
        </div>
        <div>Variables impact prix : {audit.priceImpactVariables.length}</div>
        <div>Variables indicatives : {audit.indicativeVariables.length}</div>
      </div>
      {audit.anomalies.length > 0 && (
        <ul className="text-sm text-amber-600 list-disc pl-5">
          {audit.anomalies.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
