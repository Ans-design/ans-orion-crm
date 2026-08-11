'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { AppButton } from '@/components/ui/app-ui';
import '@/components/backoffice-v2/admin-backoffice.css';

type Template = {
  id: string;
  typeBoite: string;
  formuleKey: string;
  formuleSurface: string | null;
  margeDechetsPct: number;
  coeffRabats: number;
  actif: boolean;
  visiblePos: boolean;
};

type Margin = {
  id: string;
  scope: string;
  margeDechetsPct: number;
  beneficePct: number;
  margeDepensePct: number;
  arrondiMode: string;
  actif: boolean;
};

type Anomaly = { code: string; message: string; severity: string };

export default function PackagingAdminPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  const [tab, setTab] = useState<'templates' | 'margins' | 'anomalies'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [margins, setMargins] = useState<Margin[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [main, anom] = await Promise.all([
        fetch('/api/admin-backoffice/packaging').then((r) => r.json()),
        fetch('/api/admin-backoffice/packaging?anomalies=1').then((r) => r.json()),
      ]);
      if (main.ok) {
        setTemplates(main.templates ?? []);
        setMargins(main.margins ?? []);
      }
      if (anom.ok) setAnomalies(anom.anomalies ?? []);
    } catch {
      uxToast.error('Chargement Packaging impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (entity: 'template' | 'margin', id: string, data: Record<string, unknown>) => {
    if (!canEdit) return;
    const res = await fetch('/api/admin-backoffice/packaging', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, id, data }),
    });
    const json = await res.json();
    if (!json.ok) {
      uxToast.error(getApiErrorMessage(json, 'Échec mise à jour'));
      return;
    }
    uxToast.success('Enregistré');
    void load();
  };

  const exportExcel = async () => {
    const res = await fetch('/api/admin-backoffice/packaging/export-excel');
    const json = await res.json();
    if (!json.ok) {
      uxToast.error('Export impossible');
      return;
    }
    const blob = new Blob([JSON.stringify(json.sheets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packaging-boite-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    uxToast.success('Export JSON multi-feuilles prêt (réimport Excel via import-excel)');
  };

  return (
    <div className="ab2-shell max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <Package size={22} /> Packaging — Boîte personnalisée
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gabarits surface, marges (déchets 10 % · bénéfice 30 % · marge dépense 10 %), sources Impression SF + Finitions.
            Prix final = dépenses × 1,40 (paramétrable).
          </p>
        </div>
        <div className="flex gap-2">
          <AppButton type="button" variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw size={14} /> Actualiser
          </AppButton>
          <AppButton type="button" variant="ghost" size="sm" onClick={() => void exportExcel()}>
            Export
          </AppButton>
        </div>
      </header>

      <nav className="flex gap-2 flex-wrap">
        {(
          [
            ['templates', 'Types / gabarits'],
            ['margins', 'Marges & bénéfices'],
            ['anomalies', `Anomalies (${anomalies.length})`],
          ] as const
        ).map(([id, label]) => (
          <AppButton
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? 'default' : 'ghost'}
            onClick={() => setTab(id)}
          >
            {label}
          </AppButton>
        ))}
      </nav>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : tab === 'templates' ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Type boîte</th>
                <th className="text-left p-2">Formule</th>
                <th className="text-right p-2">Déchets %</th>
                <th className="text-right p-2">Coeff rabats</th>
                <th className="text-center p-2">Actif</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-2 font-medium">{t.typeBoite}</td>
                  <td className="p-2 text-muted-foreground">{t.formuleKey}</td>
                  <td className="p-2 text-right">
                    <input
                      className="w-16 border rounded px-1 text-right"
                      type="number"
                      defaultValue={t.margeDechetsPct}
                      disabled={!canEdit}
                      onBlur={(e) =>
                        void patch('template', t.id, { margeDechetsPct: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input
                      className="w-16 border rounded px-1 text-right"
                      type="number"
                      step="0.01"
                      defaultValue={t.coeffRabats}
                      disabled={!canEdit}
                      onBlur={(e) =>
                        void patch('template', t.id, { coeffRabats: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={t.actif}
                      disabled={!canEdit}
                      onChange={(e) => void patch('template', t.id, { actif: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'margins' ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Scope</th>
                <th className="text-right p-2">Déchets %</th>
                <th className="text-right p-2">Bénéfice %</th>
                <th className="text-right p-2">Marge dépense %</th>
                <th className="text-left p-2">Arrondi</th>
              </tr>
            </thead>
            <tbody>
              {margins.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-2">{m.scope}</td>
                  <td className="p-2 text-right">
                    <input
                      className="w-16 border rounded px-1 text-right"
                      type="number"
                      defaultValue={m.margeDechetsPct}
                      disabled={!canEdit}
                      onBlur={(e) =>
                        void patch('margin', m.id, { margeDechetsPct: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input
                      className="w-16 border rounded px-1 text-right"
                      type="number"
                      defaultValue={m.beneficePct}
                      disabled={!canEdit}
                      onBlur={(e) =>
                        void patch('margin', m.id, { beneficePct: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input
                      className="w-16 border rounded px-1 text-right"
                      type="number"
                      defaultValue={m.margeDepensePct}
                      disabled={!canEdit}
                      onBlur={(e) =>
                        void patch('margin', m.id, { margeDepensePct: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="border rounded px-1"
                      defaultValue={m.arrondiMode}
                      disabled={!canEdit}
                      onChange={(e) => void patch('margin', m.id, { arrondiMode: e.target.value })}
                    >
                      <option value="exact">exact</option>
                      <option value="ceil_a4">ceil_a4</option>
                      <option value="ceil_iso_format">ceil_iso_format</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="space-y-2">
          {anomalies.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aucune anomalie détectée.</li>
          ) : (
            anomalies.map((a) => (
              <li
                key={a.code}
                className="flex items-start gap-2 text-sm border border-border rounded-lg p-3"
              >
                <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                <span>
                  <strong>{a.code}</strong> — {a.message}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
