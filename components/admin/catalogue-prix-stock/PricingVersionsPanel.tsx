'use client';

/**
 * Studio Prix — Versions tarifaires (données FormulaVersion réelles).
 * Pas de mock : liste des profils + dernière version / statut publication.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Upload } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { statusLabelFr } from '@/lib/pricing/formula-display';
import { adminStatusFilterLabel } from '@/lib/administration/admin-ui-vocab';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { AppButton } from '@/components/ui/app-ui';

type ProfileRow = {
  articleId: string;
  articleLabel: string;
  family: string | null;
  status: string;
  updatedAt?: string;
  formulaVersions?: { version: number; status: string }[];
  _count?: { formulaVersions?: number };
};

type Props = {
  canEdit: boolean;
  onOpenFormula?: (articleId: string) => void;
};

export function PricingVersionsPanel({ canEdit, onOpenFormula }: Props) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'missing'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/dynamic-pricing', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(getApiErrorMessage(d, 'Chargement impossible'));
      setProfiles(d.profiles ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    return profiles.filter((p) => {
      const fv = p.formulaVersions?.[0];
      if (filter === 'missing') return !fv;
      if (filter === 'published') return fv?.status === 'published' || p.status === 'published';
      if (filter === 'draft') return fv?.status === 'draft' || p.status === 'draft';
      return true;
    });
  }, [profiles, filter]);

  const publish = async (articleId: string) => {
    if (!canEdit) return;
    setBusyId(articleId);
    try {
      const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(getApiErrorMessage(d, 'Publication impossible'));
      uxToast.success(`Activé · ${articleId}`);
      await load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Publication échouée');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingState message="Chargement des versions…" size="sm" />;
  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} className="py-8" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: 'all' as const, label: 'Tous' },
              { id: 'published' as const, label: adminStatusFilterLabel('published') },
              { id: 'draft' as const, label: adminStatusFilterLabel('draft') },
              { id: 'missing' as const, label: 'Sans formule' },
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
        </div>
        <AppButton type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </AppButton>
      </div>

      <p className="m-0 text-xs text-slate-500">
        Une publication crée / active une FormulaVersion immuable pour le POS. Les devis et commandes déjà validés
        conservent leur instantané.
      </p>

      <div className="overflow-x-auto rounded-[7px] border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-semibold">Article</th>
              <th className="px-3 py-2 font-semibold">Famille</th>
              <th className="px-3 py-2 font-semibold">Profil</th>
              <th className="px-3 py-2 font-semibold">Dernière version</th>
              <th className="px-3 py-2 font-semibold">Versions</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const fv = p.formulaVersions?.[0];
              return (
                <tr key={p.articleId} className="border-b border-slate-50">
                  <td className="px-3 py-2">
                    <span className="font-medium text-slate-900">{p.articleLabel}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-slate-400">{p.articleId}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{p.family ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'rounded-[7px] px-1.5 py-0.5 text-[11px] font-semibold',
                        p.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800',
                      )}
                    >
                      {statusLabelFr(p.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {fv ? (
                      <>
                        v{fv.version}{' '}
                        <span className="text-slate-400">({statusLabelFr(fv.status)})</span>
                      </>
                    ) : (
                      <span className="text-amber-700">À compléter</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">
                    {p._count?.formulaVersions ?? 0}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {onOpenFormula ? (
                        <AppButton
                          type="button"
                          variant="outline"
                          onClick={() => onOpenFormula(p.articleId)}
                        >
                          Formule
                        </AppButton>
                      ) : null}
                      {canEdit ? (
                        <AppButton
                          type="button"
                          variant="default"
                          disabled={busyId === p.articleId || !fv}
                          onClick={() => void publish(p.articleId)}
                        >
                          <Upload className="h-3 w-3" />
                          {busyId === p.articleId ? '…' : 'Publier'}
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
                  Aucune version pour ce filtre.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
