'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { AppButton } from '@/components/ui/app-ui';
import '@/components/backoffice-v2/admin-backoffice.css';

type Row = Record<string, unknown> & { id: string };

export default function PackagingSoftAdminPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  const [tab, setTab] = useState<'doypack' | 'etiquette' | 'gobelet' | 'hangtag' | 'anomalies'>('doypack');
  const [doypackBlanks, setDoypackBlanks] = useState<Row[]>([]);
  const [doypackPose, setDoypackPose] = useState<Row[]>([]);
  const [etiquette, setEtiquette] = useState<Row[]>([]);
  const [cups, setCups] = useState<Row[]>([]);
  const [hangtagImp, setHangtagImp] = useState<Row[]>([]);
  const [hangtagAcc, setHangtagAcc] = useState<Row[]>([]);
  const [anomalies, setAnomalies] = useState<Array<{ code: string; message: string; severity: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [main, anom] = await Promise.all([
        fetch('/api/admin-backoffice/packaging-soft').then((r) => r.json()),
        fetch('/api/admin-backoffice/packaging-soft?anomalies=1').then((r) => r.json()),
      ]);
      if (main.ok) {
        setDoypackBlanks(main.doypackBlanks ?? []);
        setDoypackPose(main.doypackPose ?? []);
        setEtiquette(main.etiquette ?? []);
        setCups(main.cups ?? []);
        setHangtagImp(main.hangtagImp ?? []);
        setHangtagAcc(main.hangtagAcc ?? []);
      }
      if (anom.ok) setAnomalies(anom.anomalies ?? []);
    } catch {
      uxToast.error('Chargement Packaging soft impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seed = async () => {
    const res = await fetch('/api/admin-backoffice/packaging-soft?seed=1');
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
    const res = await fetch('/api/admin-backoffice/packaging-soft', {
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
    const res = await fetch('/api/admin-backoffice/packaging-soft');
    const json = await res.json();
    if (!json.ok) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            '01_DOYPACK_VIERGES': json.doypackBlanks,
            '01_ETIQUETTE_STANDARDS': json.etiquette,
            '01_GOBELETS_VIERGES': json.cups,
            '01_HANGTAG_FORMATS_IMPOSITION': json.hangtagImp,
            '04_HANGTAG_ACCESSOIRES': json.hangtagAcc,
            '04_DOYPACK_DECOUPE_POSE': json.doypackPose,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `packaging-soft-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="ab2-shell max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <Package size={22} /> Packaging soft — Doypack / Étiquette / Gobelet / Hangtag
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Listes de prix Admin (vierges, standards, imposition, accessoires). Sources GF vinyle + Finitions pour
            impression / découpe / pose.
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
            Export JSON
          </AppButton>
        </div>
      </header>

      <nav className="flex gap-2 flex-wrap">
        {(
          [
            ['doypack', 'Doypack'],
            ['etiquette', 'Étiquette'],
            ['gobelet', 'Gobelet'],
            ['hangtag', 'Hangtag'],
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
              <div key={a.code} className="flex gap-2 items-start border rounded-lg p-3 text-sm">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">{a.code}</p>
                  <p className="text-muted-foreground">{a.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'doypack' ? (
        <div className="space-y-4">
          <h2 className="font-semibold">Doypacks vierges</h2>
          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-left">
                  <th className="p-2">Matière</th>
                  <th className="p-2">Format</th>
                  <th className="p-2">L×H</th>
                  <th className="p-2">Prix vierge</th>
                  <th className="p-2">Actif</th>
                </tr>
              </thead>
              <tbody>
                {doypackBlanks.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{String(r.matiere)}</td>
                    <td className="p-2">{String(r.formatLabel)}</td>
                    <td className="p-2">
                      {String(r.largeurMm)}×{String(r.hauteurMm)}
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="ab2-input w-28"
                        defaultValue={Number(r.prixViergeHt)}
                        disabled={!canEdit}
                        onBlur={(e) =>
                          void patch('doypackBlank', r.id, { prixViergeHt: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="p-2">{r.actif ? 'Oui' : 'Non'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 className="font-semibold">Pose</h2>
          <ul className="text-sm space-y-1">
            {doypackPose.map((r) => (
              <li key={r.id}>
                {String(r.typePose)} — {String(r.prixHt)} Ar / {String(r.unite)}
              </li>
            ))}
          </ul>
        </div>
      ) : tab === 'etiquette' ? (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left">
                <th className="p-2">Vinyle</th>
                <th className="p-2">Format</th>
                <th className="p-2">Surface m²</th>
                <th className="p-2">Prix standard</th>
              </tr>
            </thead>
            <tbody>
              {etiquette.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{String(r.typeVinyle)}</td>
                  <td className="p-2">{String(r.formatStandard)}</td>
                  <td className="p-2">{String(r.surfaceM2)}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="ab2-input w-28"
                      defaultValue={Number(r.prixStandardHt)}
                      disabled={!canEdit}
                      onBlur={(e) =>
                        void patch('etiquette', r.id, { prixStandardHt: Number(e.target.value) })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'gobelet' ? (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left">
                <th className="p-2">Type</th>
                <th className="p-2">Contenance</th>
                <th className="p-2">Prix vierge</th>
              </tr>
            </thead>
            <tbody>
              {cups.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{String(r.typeGobelet)}</td>
                  <td className="p-2">{String(r.contenance ?? '—')}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="ab2-input w-28"
                      defaultValue={Number(r.prixViergeHt)}
                      disabled={!canEdit}
                      onBlur={(e) => void patch('cup', r.id, { prixViergeHt: Number(e.target.value) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-semibold">Imposition</h2>
          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-left">
                  <th className="p-2">Format</th>
                  <th className="p-2">mm</th>
                  <th className="p-2">Pièces/feuille</th>
                </tr>
              </thead>
              <tbody>
                {hangtagImp.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{String(r.formatFini)}</td>
                    <td className="p-2">
                      {String(r.largeurMm)}×{String(r.hauteurMm)}
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="ab2-input w-20"
                        defaultValue={Number(r.piecesParFeuille ?? 0)}
                        disabled={!canEdit}
                        onBlur={(e) =>
                          void patch('hangtagImp', r.id, { piecesParFeuille: Number(e.target.value) })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 className="font-semibold">Accessoires</h2>
          <ul className="text-sm space-y-1">
            {hangtagAcc.map((r) => (
              <li key={r.id}>
                {String(r.accessoire)} — {String(r.prixHt)} Ar
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
