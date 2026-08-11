'use client';

/**
 * Simulateur Studio Prix — même resolvePrice / moteur que POS (API /api/pricing/simulate).
 * Liste d’articles depuis les profils dynamiques réels (fallback catalogue legacy).
 */
import { useEffect, useState } from 'react';
import { Calculator, Play } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import {
  computeFinancialBreakdown,
  formatRatePct,
} from '@/lib/pricing/financial-definitions';
import { CATALOGUE, formatPrice } from '@/lib/data/catalogue';
import { statusLabelFr } from '@/lib/pricing/formula-display';
import { AppButton } from '@/components/ui/app-ui';

type ProfileOption = { id: string; label: string; status: string };

export function PricingSimulatorPanel() {
  const [articles, setArticles] = useState<ProfileOption[]>([]);
  const [articleId, setArticleId] = useState('');
  const [qty, setQty] = useState(100);
  const [configJson, setConfigJson] = useState('{}');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingArticles(true);
      try {
        const r = await fetch('/api/dynamic-pricing', { cache: 'no-store' });
        const d = await r.json();
        if (r.ok && Array.isArray(d.profiles) && d.profiles.length > 0) {
          const opts: ProfileOption[] = d.profiles.map(
            (p: { articleId: string; articleLabel: string; status: string }) => ({
              id: p.articleId,
              label: `${p.articleLabel} (${statusLabelFr(p.status)})`,
              status: p.status,
            }),
          );
          setArticles(opts);
          setArticleId(opts[0]?.id ?? '');
        } else {
          const opts = CATALOGUE.map((a) => ({
            id: a.id,
            label: a.name,
            status: 'legacy',
          }));
          setArticles(opts);
          setArticleId(opts[0]?.id ?? 'pkg-doypack');
        }
      } catch {
        const opts = CATALOGUE.map((a) => ({
          id: a.id,
          label: a.name,
          status: 'legacy',
        }));
        setArticles(opts);
        setArticleId(opts[0]?.id ?? 'pkg-doypack');
      } finally {
        setLoadingArticles(false);
      }
    })();
  }, []);

  const run = async () => {
    if (!articleId) {
      uxToast.error('Sélectionnez un article');
      return;
    }
    setLoading(true);
    let extra: Record<string, unknown> = {};
    try {
      extra = configJson.trim() ? JSON.parse(configJson) : {};
    } catch {
      uxToast.error('JSON config invalide');
      setLoading(false);
      return;
    }

    try {
      const r = await fetch('/api/pricing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          qty,
          config: { qty, ...extra },
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setResult(d);
      } else {
        setResult(null);
        uxToast.error(typeof d.error === 'string' ? d.error : d.error?.message ?? 'Simulation échouée');
      }
    } catch {
      setResult(null);
      uxToast.error('Erreur réseau');
    }
    setLoading(false);
  };

  const dynamicFormula = result?.dynamicFormula as
    | { version?: number; status?: string; expression?: string }
    | null
    | undefined;
  const margin = result?.margin as
    | { cost?: number; benefit?: number; marginRate?: number; markupRate?: number }
    | null
    | undefined;
  const financial = margin
    ? computeFinancialBreakdown(
        Number(result?.prixUnitaire ?? result?.totalHT ?? 0),
        Number(margin.cost ?? 0),
      )
    : null;

  return (
    <div className="orion-card space-y-4 rounded-[7px] border border-slate-200 bg-white p-4">
      <h3 className="orion-section-title m-0 flex items-center gap-2 text-sm font-bold text-slate-900">
        <Calculator size={16} className="text-primary" />
        Simulateur — même moteur que le POS
      </h3>
      <p className="m-0 text-xs text-slate-500">
        Appelle <code className="rounded bg-slate-100 px-1">/api/pricing/simulate</code> →{' '}
        <code className="rounded bg-slate-100 px-1">resolvePrice</code> serveur. Aucun calcul fictif React.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Article (profils DB)</label>
          <select
            value={articleId}
            onChange={(e) => setArticleId(e.target.value)}
            disabled={loadingArticles}
            className="w-full rounded-[7px] border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Quantité</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 1)}
            className="w-full rounded-[7px] border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
          />
        </div>
        <div className="flex items-end">
          <AppButton
            type="button"
            onClick={() => void run()}
            disabled={loading || !articleId}
            variant="default"
            className="w-full justify-center"
          >
            <Play size={14} /> {loading ? 'Calcul…' : 'Simuler'}
          </AppButton>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500">Config JSON (options POS)</label>
        <textarea
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          rows={3}
          className="w-full rounded-[7px] border border-slate-200 bg-white px-3 py-2 font-mono text-xs"
          placeholder='{"matiere":"...","format":"A4"}'
        />
      </div>

      {result ? (
        <div className="space-y-2 rounded-[7px] border border-slate-100 bg-slate-50 p-4 text-sm">
          <p className="m-0">
            <span className="text-slate-500">Prix unitaire :</span>{' '}
            <strong className="font-mono">
              {formatPrice(Number(result.prixUnitaire ?? 0))} Ar
            </strong>
          </p>
          <p className="m-0">
            <span className="text-slate-500">Total HT :</span>{' '}
            <strong className="font-mono">
              {formatPrice(Number(result.totalHT ?? result.total ?? 0))} Ar
            </strong>
          </p>
          {result.totalTTC != null ? (
            <p className="m-0">
              <span className="text-slate-500">Total TTC :</span>{' '}
              <strong className="font-mono text-primary">
                {formatPrice(Number(result.totalTTC))} Ar
              </strong>
            </p>
          ) : null}
          <p className="m-0">
            <span className="text-slate-500">Moteur :</span>{' '}
            {String(result.engine) === 'dynamic' ? (
              <span className="font-semibold text-emerald-600">Dynamique (publié)</span>
            ) : (
              <span className="font-semibold text-amber-600">Legacy / fallback</span>
            )}
          </p>
          {dynamicFormula ? (
            <p className="m-0 text-xs text-slate-600">
              FormulaVersion publiée : v{dynamicFormula.version ?? '—'} ({dynamicFormula.status ?? '—'})
            </p>
          ) : (
            <p className="m-0 text-xs text-amber-700">
              Aucune FormulaVersion publiée chargée — le POS peut basculer en legacy.
            </p>
          )}
          {financial || margin ? (
            <div className="border-t border-slate-200 pt-2 text-xs text-slate-600">
              <p className="m-0">
                Coût estimé : {formatPrice(Number(financial?.costComplete ?? margin?.cost ?? 0))} Ar ·
                Bénéfice : {formatPrice(Number(financial?.benefit ?? margin?.benefit ?? 0))} Ar
              </p>
              <p className="m-0 mt-0.5">
                Taux de marge <em>(sur coût)</em> :{' '}
                {formatRatePct(
                  financial?.marginOnCostRate
                    ?? (margin?.marginRate != null ? Number(margin.marginRate) : null),
                )}
                {' · '}
                Taux de marque <em>(sur vente)</em> :{' '}
                {formatRatePct(
                  financial?.markupOnSellRate
                    ?? (margin?.markupRate != null ? Number(margin.markupRate) : null),
                )}
              </p>
            </div>
          ) : null}
          {Boolean(result.formulaApplied) ? (
            <p className="m-0 border-t border-slate-200 pt-2 font-mono text-xs text-slate-500">
              {String(result.formulaApplied)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
