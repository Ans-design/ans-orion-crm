'use client';

/**
 * Diagnostics commerciaux Admin ↔ POS (Ultra-Prompt §13).
 * Données réelles : profils ArticlePricingProfile + FormulaVersion.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { AppButton } from '@/components/ui/app-ui';

import { resolvePublicationParity } from '@/lib/pricing/publication-parity';
import { extractCoherenceMeta } from '@/lib/pricing/commercial-projection-meta';
import { getApiErrorMessage } from '@/lib/api-client';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type ProfileRow = {
  articleId: string;
  articleLabel: string;
  family: string | null;
  status: string;
  formulaVersions?: { version: number; status: string; variables?: unknown }[];
  _count?: { formulaVersions?: number };
};

type Props = {
  onOpenFormula?: (articleId: string) => void;
  onOpenProduct?: (articleId: string) => void;
};

function pubState(p: ProfileRow, opts?: { posParityVerified?: boolean; posDriftCount?: number }) {
  const fv = p.formulaVersions?.[0] ?? null;
  const meta = fv ? extractCoherenceMeta(fv.variables) : null;
  return resolvePublicationParity({
    profileStatus: p.status,
    latestFormula: fv
      ? { version: fv.version, status: fv.status, coherenceHash: meta?.hash ?? null }
      : null,
    posParityVerified: opts?.posParityVerified,
    posDriftCount: opts?.posDriftCount,
  });
}

export function PosPublicationParityPanel({ onOpenFormula, onOpenProduct }: Props) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'ok' | 'issue'>('issue');
  const [posDriftCount, setPosDriftCount] = useState<number | null>(null);
  const [posChecked, setPosChecked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, diag] = await Promise.all([
        fetch('/api/dynamic-pricing', { cache: 'no-store' }),
        fetch('/api/admin-backoffice/sync-diagnostics', { cache: 'no-store' }).catch(() => null),
      ]);
      const d = await r.json();
      if (!r.ok) throw new Error(getApiErrorMessage(d, 'Chargement impossible'));
      setProfiles(d.profiles ?? []);

      if (diag?.ok) {
        const body = await diag.json().catch(() => null);
        const score = Number(body?.summary?.driftScore ?? 0);
        const hasError = Array.isArray(body?.diagnostics)
          ? body.diagnostics.some((x: { status?: string }) => x.status === 'error')
          : false;
        setPosDriftCount(hasError ? Math.max(1, score) : score);
        setPosChecked(true);
      } else {
        setPosDriftCount(null);
        setPosChecked(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setProfiles([]);
      setPosChecked(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parityOpts = useMemo(
    () => ({
      posParityVerified: posChecked && (posDriftCount ?? 1) === 0,
      posDriftCount: posDriftCount ?? undefined,
    }),
    [posChecked, posDriftCount],
  );

  const rows = useMemo(() => {
    return profiles
      .map((p) => ({ p, state: pubState(p, parityOpts) }))
      .filter(({ state }) => {
        if (filter === 'ok') return state.tone === 'ok';
        if (filter === 'issue') return state.tone !== 'ok' && state.tone !== 'muted';
        return true;
      });
  }, [profiles, filter, parityOpts]);

  const summary = useMemo(() => {
    const states = profiles.map((p) => pubState(p, parityOpts));
    return {
      ok: states.filter((s) => s.tone === 'ok').length,
      issue: states.filter((s) => s.tone === 'warn' || s.tone === 'danger').length,
      muted: states.filter((s) => s.tone === 'muted').length,
    };
  }, [profiles, parityOpts]);

  if (loading) return <LoadingState message="Analyse parité Admin ↔ POS…" size="sm" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} className="py-8" />;

  return (
    <div className="space-y-3">
      {!posChecked ? (
        <p className="m-0 rounded-[7px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Contrôle de dérive POS indisponible — aucun profil n’est marqué « Synchronisé » tant que la
          parité n’est pas vérifiée.
        </p>
      ) : posDriftCount && posDriftCount > 0 ? (
        <p className="m-0 rounded-[7px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          Drift détecté (score {posDriftCount}) — resynchronisez ou corrigez avant de considérer le POS à jour.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          <span><strong className="text-emerald-700">{summary.ok}</strong> synchronisés</span>
          <span><strong className="text-amber-700">{summary.issue}</strong> à traiter</span>
          <span><strong className="text-slate-500">{summary.muted}</strong> sans formule</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: 'issue' as const, label: 'Écarts' },
              { id: 'ok' as const, label: 'OK' },
              { id: 'all' as const, label: 'Tous' },
            ] as const
          ).map((f) => (
            <AppButton
              key={f.id}
              type="button"
              variant={filter === f.id ? 'default' : 'outline'}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </AppButton>
          ))}
          <AppButton type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Réanalyser
          </AppButton>
        </div>
      </div>

      <p className="m-0 text-xs text-slate-500">
        Le POS ne consomme que les configurations <em>actives</em>. Un produit « à compléter »
        n’est jamais marqué synchronisé.
      </p>

      <div className="overflow-x-auto rounded-[7px] border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-semibold">Article Admin</th>
              <th className="px-3 py-2 font-semibold">ID canonique</th>
              <th className="px-3 py-2 font-semibold">Disponibilité</th>
              <th className="px-3 py-2 font-semibold">Formule</th>
              <th className="px-3 py-2 font-semibold">État POS</th>
              <th className="px-3 py-2 font-semibold">Cause / action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, state }) => {
              const fv = p.formulaVersions?.[0];
              const profileLabel = adminStatusLabel(p.status);
              const formulaLabel = fv ? adminStatusLabel(fv.status) : '—';
              return (
                <tr key={p.articleId} className="border-b border-slate-50 align-top">
                  <td className="px-3 py-2 font-medium text-slate-900">{p.articleLabel}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{p.articleId}</td>
                  <td className="px-3 py-2 text-slate-700">{profileLabel}</td>
                  <td className="px-3 py-2 text-slate-700">{formulaLabel}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'rounded-[7px] px-1.5 py-0.5 text-[11px] font-semibold',
                        state.tone === 'ok' && 'bg-emerald-50 text-emerald-700',
                        state.tone === 'warn' && 'bg-amber-50 text-amber-800',
                        state.tone === 'danger' && 'bg-red-50 text-red-700',
                        state.tone === 'muted' && 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {state.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    <p className="m-0">{state.cause}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {onOpenProduct ? (
                        <AppButton type="button" variant="outline" onClick={() => onOpenProduct(p.articleId)}>
                          Produit
                        </AppButton>
                      ) : null}
                      {onOpenFormula ? (
                        <AppButton type="button" variant="outline" onClick={() => onOpenFormula(p.articleId)}>
                          Formule
                        </AppButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Aucun écart pour ce filtre.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
