'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { AppButton } from '@/components/ui/app-ui';
import '@/components/backoffice-v2/admin-backoffice.css';

type Row = Record<string, unknown> & { id: string };

export default function PackagingSacAdminPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  const [tab, setTab] = useState<'types' | 'marges' | 'accessoires' | 'anomalies'>('types');
  const [templates, setTemplates] = useState<Row[]>([]);
  const [margins, setMargins] = useState<Row[]>([]);
  const [accessories, setAccessories] = useState<Row[]>([]);
  const [anomalies, setAnomalies] = useState<Array<{ code: string; message: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [main, anom] = await Promise.all([
        fetch('/api/admin-backoffice/packaging-sac').then((r) => r.json()),
        fetch('/api/admin-backoffice/packaging-sac?anomalies=1').then((r) => r.json()),
      ]);
      if (main.ok) {
        setTemplates(main.templates ?? []);
        setMargins(main.margins ?? []);
        setAccessories(main.accessories ?? []);
      }
      if (anom.ok) setAnomalies(anom.anomalies ?? []);
    } catch {
      uxToast.error('Chargement Sac papier impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seed = async () => {
    const res = await fetch('/api/admin-backoffice/packaging-sac?seed=1');
    const json = await res.json();
    if (!json.ok) {
      uxToast.error('Seed impossible');
      return;
    }
    uxToast.success('Défauts seedés');
    void load();
  };

  const patch = async (entity: string, id: string, data: Record<string, unknown>) => {
    if (!canEdit) return;
    const res = await fetch('/api/admin-backoffice/packaging-sac', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, id, data }),
    });
    const json = await res.json();
    if (!json.ok) {
      uxToast.error(getApiErrorMessage(json, 'Échec'));
      return;
    }
    uxToast.success('Enregistré');
    void load();
  };

  const exportJson = async () => {
    const res = await fetch('/api/admin-backoffice/packaging-sac');
    const json = await res.json();
    if (!json.ok) return;
    const blob = new Blob([JSON.stringify(json.sheets ?? json, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `packaging-sac-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="ab2-shell max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <Package size={22} /> Packaging — Sac en papier
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Surface développée L/P/H · Impression SF · Finitions · Accessoires · dépenses × 1,40
            (paramétrable).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AppButton type="button" variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw size={14} /> Actualiser
          </AppButton>
          <AppButton type="button" variant="ghost" size="sm" onClick={() => void seed()}>
            Seed défauts
          </AppButton>
          <AppButton type="button" variant="ghost" size="sm" onClick={() => void exportJson()}>
            Export
          </AppButton>
        </div>
      </header>

      <nav className="flex gap-2 flex-wrap">
        {(
          [
            ['types', 'Types / gabarits'],
            ['marges', 'Marges'],
            ['accessoires', 'Accessoires'],
            ['anomalies', 'Anomalies'],
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
      ) : tab === 'anomalies' ? (
        <div className="space-y-2">
          {anomalies.length === 0 ? (
            <p className="text-sm text-emerald-700">Aucune anomalie détectée.</p>
          ) : (
            anomalies.map((a) => (
              <div key={a.code} className="flex gap-2 border rounded-lg p-3 text-sm">
                <AlertTriangle size={16} className="text-amber-600" />
                <div>
                  <p className="font-medium">{a.code}</p>
                  <p className="text-muted-foreground">{a.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'types' ? (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left">
                <th className="p-2">Type</th>
                <th className="p-2">Coeff. fond</th>
                <th className="p-2">Rabat mm</th>
                <th className="p-2">Patte mm</th>
                <th className="p-2">Déchets %</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{String(r.typeSac)}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.05"
                      className="ab2-input w-20"
                      defaultValue={Number(r.coefficientFond)}
                      disabled={!canEdit}
                      onBlur={(e) =>
                        void patch('template', r.id, { coefficientFond: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="p-2">{String(r.rabatHautMm)}</td>
                  <td className="p-2">{String(r.patteCollageMm)}</td>
                  <td className="p-2">{String(r.margeDechetsPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'marges' ? (
        <ul className="text-sm space-y-2">
          {margins.map((r) => (
            <li key={r.id} className="border rounded-lg p-3">
              Scope {String(r.scope)} — déchets {String(r.margeDechetsPct)}% · bénéfice{' '}
              {String(r.beneficePct)}% · marge {String(r.margeDepensePct)}%
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left">
                <th className="p-2">Accessoire</th>
                <th className="p-2">Unité</th>
                <th className="p-2">Prix HT</th>
              </tr>
            </thead>
            <tbody>
              {accessories.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{String(r.accessoire)}</td>
                  <td className="p-2">{String(r.unite)}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="ab2-input w-24"
                      defaultValue={Number(r.prixHt)}
                      disabled={!canEdit}
                      onBlur={(e) => void patch('accessory', r.id, { prixHt: Number(e.target.value) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
