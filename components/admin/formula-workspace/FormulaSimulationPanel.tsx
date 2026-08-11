'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { uxToast } from '@/lib/ux/feedback';

type Props = {
  articleId: string;
};

type SimResult = {
  prixUnitaire?: number;
  total?: number;
  engine?: string;
  error?: string;
};

export function FormulaSimulationPanel({ articleId }: Props) {
  const [qty, setQty] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch('/api/pricing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          qty,
          config: { qty },
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        const msg = d.error ?? 'Simulation impossible';
        uxToast.error(typeof msg === 'string' ? msg : 'Simulation impossible');
        setResult({ error: typeof msg === 'string' ? msg : 'Erreur' });
      } else {
        setResult({
          prixUnitaire: d.prixUnitaire,
          total: d.total,
          engine: d.engine,
        });
      }
    } catch {
      uxToast.error('Erreur réseau');
      setResult({ error: 'Erreur réseau' });
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n?: number) =>
    n == null ? '—' : `${Math.round(n).toLocaleString('fr-FR')} Ar`;

  return (
    <div className="fw-panel" aria-label="Simulation">
      <h3 className="fw-section-title">Simulation</h3>
      <p className="fw-muted mb-2 text-[12px]">
        Appelle le pricingResolver serveur (version publiée tant que le brouillon n’est pas publié).
      </p>
      <label className="fw-field">
        <span className="fw-field__label">Quantité</span>
        <input
          type="number"
          min={1}
          className="fw-input"
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        />
      </label>
      <AppButton type="button" variant="default" className="mt-2 w-full justify-center" disabled={loading} onClick={() => void run()}>
        <Play className="h-4 w-4" />
        {loading ? 'Calcul…' : 'Tester'}
      </AppButton>
      {result?.error ? (
        <p className="mt-2 text-sm text-red-600">{result.error}</p>
      ) : result ? (
        <dl className="fw-sim-result mt-3">
          <div>
            <dt>Prix unitaire</dt>
            <dd>{fmt(result.prixUnitaire)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{fmt(result.total)}</dd>
          </div>
          <div>
            <dt>Moteur</dt>
            <dd>{result.engine ?? '—'}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
