'use client';

import { useCallback, useState } from 'react';
import { AppButton } from '@/components/ui/app-ui';
import { Button } from '@/components/ui/button';

type PriceResult = {
  articleId: string;
  qty: number;
  prixUnitaire: number;
  sousTotal: number;
  totalHT: number;
  pricingMode: string;
  formulaApplied?: string;
  snapshot?: {
    priceSource?: string;
    priceNotConfigured?: boolean;
    legacyPrixDepart?: number | null;
    carterie?: {
      calculable: boolean;
      pricingMode?: string;
      gridColumnLabel?: string;
      gridTierLabel?: string;
      prixUnitaire: number;
      formula?: string;
      missingField?: string;
    };
    isf?: {
      calculable: boolean;
      prixUnitaire?: number;
    };
  };
};

type TestCase = {
  id: string;
  label: string;
  articleId: string;
  qty: number;
  config: Record<string, unknown>;
  expectedMin?: number;
  expectedMax?: number;
  note?: string;
};

const PRESET_TESTS: TestCase[] = [
  {
    id: 'cv-pvc-recto-50',
    label: 'Carte de visite — PVC opaque 1 mm, Recto, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'PVC opaque 1 mm', grammage: '1 mm', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 1200,
    expectedMax: 1500,
    note: 'PVC opaque = ~1 300 Ar/pièce (grille PRIX 2026)',
  },
  {
    id: 'cv-pvc-rv-50',
    label: 'Carte de visite — PVC opaque 1 mm, Recto/Verso, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'PVC opaque 1 mm', grammage: '1 mm', face: 'Recto/Verso', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 1400,
    expectedMax: 1700,
    note: 'PVC opaque R/V = ~1 500 Ar/pièce',
  },
  {
    id: 'cv-pcb-recto-50',
    label: 'Carte de visite — PCB 300g, Recto, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'PCB', grammage: '300g', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 150,
    expectedMax: 250,
    note: 'PCB standard = 200 Ar/pièce (50–199)',
  },
  {
    id: 'cv-pcb350-recto-50',
    label: 'Carte de visite — PCB 350g, Recto, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'PCB', grammage: '350g', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 300,
    expectedMax: 450,
    note: 'PCB 350g = 350 Ar/pièce (50–199)',
  },
  {
    id: 'cv-pcb600-recto-50',
    label: 'Carte de visite — PCB 600g, Recto, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'PCB', grammage: '600g', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 450,
    expectedMax: 600,
    note: 'PCB 600g = 500 Ar/pièce (50–199)',
  },
  {
    id: 'cv-pellicule-recto-50',
    label: 'Carte de visite — Papier pelliculé mat 320g, Recto, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'Papier pelliculé mat', grammage: '320g', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 400,
    expectedMax: 550,
    note: 'Pelliculé 320g = 450 Ar/pièce (50–199)',
  },
  {
    id: 'cv-kraft-recto-50',
    label: 'Carte de visite — Kraft 300g, Recto, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'Kraft', grammage: '300g', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 150,
    expectedMax: 250,
    note: 'Kraft → même grille PCB standard = 200 Ar',
  },
  {
    id: 'cv-texture-recto-50',
    label: 'Carte de visite — Papier texturé avec motif 350g, Recto, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'Papier texturé avec motif', grammage: '350g', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 300,
    expectedMax: 450,
    note: 'Texturé 350g → PCB 350g = 350 Ar',
  },
  {
    id: 'cv-invitation-recto-50',
    label: 'Carte de visite — Invitation luxe 300g, Recto, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'Invitation luxe', grammage: '300g', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 250,
    expectedMax: 400,
    note: 'Invitation = 300 Ar/pièce (50–199)',
  },
  {
    id: 'cv-toile-recto-50',
    label: 'Carte de visite — Toile fin 270g, Recto, 50 pcs',
    articleId: 'cv-std',
    qty: 50,
    config: { matiere: 'Toile fin', grammage: '270g', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' },
    expectedMin: 250,
    expectedMax: 400,
    note: 'Toile fin = 300 Ar/pièce (50–199)',
  },
  {
    id: 'flyer-a5-pcb115-rv',
    label: 'Flyer A5 — PCB 115g, Recto/Verso, 100 pcs',
    articleId: 'fly-std',
    qty: 100,
    config: { matiere: 'PCB', grammage: '115g', face: 'Recto/Verso', format: 'A5' },
    expectedMin: 50,
    expectedMax: 400,
    note: 'Flyer A5 R/V PCB',
  },
];

function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />;
  return (
    <span className={`w-2.5 h-2.5 rounded-full inline-block ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
  );
}

function formatPrix(v: number): string {
  if (!Number.isFinite(v) || v === 0) return '—';
  return `${v.toLocaleString('fr-FR')} Ar`;
}

export function PrixDiagnosticPanel() {
  const [results, setResults] = useState<Map<string, { result?: PriceResult; error?: string; loading: boolean }>>(
    new Map(),
  );
  const [customArticleId, setCustomArticleId] = useState('cv-std');
  const [customQty, setCustomQty] = useState('50');
  const [customConfig, setCustomConfig] = useState(
    JSON.stringify({ matiere: 'PVC opaque 1 mm', grammage: '1 mm', face: 'Recto', format: '85×55 mm', coins: 'Bord carré' }, null, 2),
  );
  const [customResult, setCustomResult] = useState<PriceResult | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const testOne = useCallback(async (tc: TestCase) => {
    setResults((prev) => new Map(prev).set(tc.id, { loading: true }));
    try {
      const r = await fetch('/api/pos/price-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: tc.articleId, config: { ...tc.config, qty: tc.qty } }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        setResults((prev) => new Map(prev).set(tc.id, { result: d.result, loading: false }));
      } else {
        setResults((prev) => new Map(prev).set(tc.id, { error: d.error?.message ?? 'Erreur', loading: false }));
      }
    } catch {
      setResults((prev) => new Map(prev).set(tc.id, { error: 'Erreur réseau', loading: false }));
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunningAll(true);
    for (const tc of PRESET_TESTS) {
      await testOne(tc);
    }
    setRunningAll(false);
  }, [testOne]);

  const testCustom = useCallback(async () => {
    setCustomError(null);
    setCustomResult(null);
    let cfg: Record<string, unknown>;
    try {
      cfg = JSON.parse(customConfig);
    } catch {
      setCustomError('JSON invalide dans la config');
      return;
    }
    try {
      const r = await fetch('/api/pos/price-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: customArticleId, config: { ...cfg, qty: Number(customQty) || 50 } }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        setCustomResult(d.result);
      } else {
        setCustomError(d.error?.message ?? 'Calcul impossible');
      }
    } catch {
      setCustomError('Erreur réseau');
    }
  }, [customArticleId, customQty, customConfig]);

  const failCount = PRESET_TESTS.filter((tc) => {
    const s = results.get(tc.id);
    if (!s?.result) return false;
    const pu = s.result.prixUnitaire;
    if (tc.expectedMin != null && pu < tc.expectedMin) return true;
    if (tc.expectedMax != null && pu > tc.expectedMax) return true;
    return false;
  }).length;

  const passCount = PRESET_TESTS.filter((tc) => {
    const s = results.get(tc.id);
    if (!s?.result) return false;
    const pu = s.result.prixUnitaire;
    if (tc.expectedMin != null && pu < tc.expectedMin) return false;
    if (tc.expectedMax != null && pu > tc.expectedMax) return false;
    return true;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Diagnostic des prix POS</h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Teste le moteur de calcul sur toutes les combinaisons critiques. Résultats en temps réel depuis l&apos;API.
          Un résultat <span className="text-red-600 font-medium">hors plage</span> = prix non conforme au référentiel 2026.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <AppButton type="button" variant="default" size="sm" onClick={runAll} disabled={runningAll}>
          {runningAll ? 'Tests en cours…' : 'Lancer tous les tests'}
        </AppButton>
        {results.size > 0 && (
          <span className="text-sm">
            <span className="text-emerald-600 font-medium">{passCount} OK</span>
            {failCount > 0 && <> · <span className="text-red-600 font-medium">{failCount} hors plage</span></>}
            {' '}/ {PRESET_TESTS.length}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="p-2">Statut</th>
              <th className="p-2">Test</th>
              <th className="p-2 text-right">Prix/pièce</th>
              <th className="p-2 text-right">Attendu</th>
              <th className="p-2">Source</th>
              <th className="p-2">Formule / colonne</th>
              <th className="p-2">
                <AppButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-5 px-1"
                  onClick={() => PRESET_TESTS.forEach((tc) => void testOne(tc))}
                >
                  ↻ Tout tester
                </AppButton>
              </th>
            </tr>
          </thead>
          <tbody>
            {PRESET_TESTS.map((tc) => {
              const s = results.get(tc.id);
              const pu = s?.result?.prixUnitaire ?? null;
              const inRange =
                pu != null && pu > 0
                  ? (tc.expectedMin == null || pu >= tc.expectedMin) &&
                    (tc.expectedMax == null || pu <= tc.expectedMax)
                  : null;
              const source = s?.result?.snapshot?.priceSource ?? s?.result?.pricingMode ?? null;
              const colLabel =
                s?.result?.snapshot?.carterie?.gridColumnLabel ??
                s?.result?.snapshot?.carterie?.formula ??
                s?.result?.formulaApplied ??
                null;
              const notConfigured = s?.result?.snapshot?.priceNotConfigured;

              return (
                <tr key={tc.id} className="border-t hover:bg-muted/20">
                  <td className="p-2">
                    {s?.loading ? (
                      <span className="text-slate-400">…</span>
                    ) : (
                      <StatusDot ok={inRange} />
                    )}
                  </td>
                  <td className="p-2 max-w-xs">
                    <div className="font-medium">{tc.label}</div>
                    {tc.note && <div className="text-[10px] text-muted-foreground">{tc.note}</div>}
                  </td>
                  <td className={`p-2 text-right font-mono font-semibold ${notConfigured ? 'text-slate-400' : inRange === false ? 'text-red-600' : inRange === true ? 'text-emerald-700' : ''}`}>
                    {s?.loading ? '…' : s?.error ? <span className="text-red-600">{s.error}</span> : pu != null ? formatPrix(pu) : '—'}
                  </td>
                  <td className="p-2 text-right text-muted-foreground">
                    {tc.expectedMin != null && tc.expectedMax != null
                      ? `${tc.expectedMin}–${tc.expectedMax} Ar`
                      : tc.expectedMin != null
                        ? `≥${tc.expectedMin} Ar`
                        : '—'}
                  </td>
                  <td className="p-2 text-[10px] text-muted-foreground font-mono">
                    {notConfigured ? <span className="text-amber-600">non configuré</span> : source ?? '—'}
                  </td>
                  <td className="p-2 text-[10px] text-muted-foreground max-w-[200px] truncate">
                    {colLabel ?? '—'}
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6 px-1.5"
                      disabled={s?.loading}
                      onClick={() => void testOne(tc)}
                    >
                      Tester
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-medium text-sm">Test personnalisé</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Article ID</label>
            <input
              className="w-full rounded-[7px] border bg-background px-3 py-1.5 text-sm"
              value={customArticleId}
              onChange={(e) => setCustomArticleId(e.target.value)}
              placeholder="cv-std, fly-std, …"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Quantité</label>
            <input
              className="w-full rounded-[7px] border bg-background px-3 py-1.5 text-sm"
              type="number"
              value={customQty}
              onChange={(e) => setCustomQty(e.target.value)}
              min={1}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Config (JSON)</label>
          <textarea
            className="w-full rounded-[7px] border bg-background px-3 py-2 text-xs font-mono h-28"
            value={customConfig}
            onChange={(e) => setCustomConfig(e.target.value)}
          />
        </div>
        <AppButton type="button" size="sm" onClick={testCustom}>
          Calculer
        </AppButton>
        {customError && <p className="text-xs text-red-600">{customError}</p>}
        {customResult && (
          <div className="rounded-[7px] border bg-muted/30 p-3 text-xs space-y-1 font-mono">
            <p>
              <span className="font-semibold">Prix unitaire :</span>{' '}
              <span className={customResult.prixUnitaire > 0 ? 'text-emerald-700 font-bold' : 'text-red-600'}>
                {formatPrix(customResult.prixUnitaire)}
              </span>
            </p>
            <p><span className="font-semibold">Total HT :</span> {formatPrix(customResult.totalHT)}</p>
            <p><span className="font-semibold">Mode :</span> {customResult.pricingMode}</p>
            {customResult.formulaApplied && (
              <p><span className="font-semibold">Formule :</span> {customResult.formulaApplied}</p>
            )}
            {customResult.snapshot?.priceNotConfigured && (
              <p className="text-amber-600">⚠ Prix non configuré en DB — action requise</p>
            )}
            {customResult.snapshot?.carterie && (
              <>
                <p><span className="font-semibold">Carterie mode :</span> {customResult.snapshot.carterie.pricingMode ?? '—'}</p>
                <p><span className="font-semibold">Colonne grille :</span> {customResult.snapshot.carterie.gridColumnLabel ?? '—'}</p>
                <p><span className="font-semibold">Palier :</span> {customResult.snapshot.carterie.gridTierLabel ?? '—'}</p>
                {customResult.snapshot.carterie.missingField && (
                  <p className="text-red-600">Champ manquant : {customResult.snapshot.carterie.missingField}</p>
                )}
              </>
            )}
            <details className="mt-1">
              <summary className="cursor-pointer text-[10px] text-muted-foreground">Snapshot complet</summary>
              <pre className="text-[10px] mt-1 max-h-40 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(customResult.snapshot, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
