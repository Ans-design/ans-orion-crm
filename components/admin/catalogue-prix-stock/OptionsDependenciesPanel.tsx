'use client';

/**
 * Options & dépendances — constructeur SI / ALORS (Studio Prix, refonte premium).
 * Source : OptionDependency via API réelle — les chips restent une projection UI
 * de ProductOptionGroup / ProductOptionValue (aucune bibliothèque concurrente).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, GitBranch, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppButton } from '@/components/ui/app-ui';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

type DepRow = {
  id: string;
  articleId: string;
  sourceField: string;
  sourceValue: string;
  targetField: string;
  allowedValues: string;
  action: string;
  active: boolean;
  details?: string | null;
};

type DepIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  articleId: string;
};

type Props = {
  canEdit: boolean;
};

function actionLabel(action: string): string {
  if (action === 'hide') return 'Masquer';
  if (action === 'show') return 'Afficher';
  if (action === 'disable') return 'Désactiver';
  return 'Limiter';
}

export function OptionsDependenciesPanel({ canEdit }: Props) {
  const [rows, setRows] = useState<DepRow[]>([]);
  const [issues, setIssues] = useState<DepIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [articleId, setArticleId] = useState('');
  const [sourceField, setSourceField] = useState('matiere');
  const [sourceValue, setSourceValue] = useState('');
  const [targetField, setTargetField] = useState('finition');
  const [allowedValues, setAllowedValues] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = articleId.trim() ? `?articleId=${encodeURIComponent(articleId.trim())}` : '';
      const r = await fetch(`/api/admin-backoffice/option-dependencies${qs}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data?.rows ?? []);
      setIssues(d.data?.issues ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setRows([]);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.articleId.toLowerCase().includes(q) ||
        r.sourceField.toLowerCase().includes(q) ||
        r.sourceValue.toLowerCase().includes(q) ||
        r.targetField.toLowerCase().includes(q) ||
        String(r.allowedValues ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const create = async () => {
    if (!canEdit) return;
    if (!articleId.trim() || !sourceValue.trim() || !targetField.trim()) {
      uxToast.error('Article, valeur source et champ cible requis');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/admin-backoffice/option-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: articleId.trim(),
          sourceField,
          sourceValue: sourceValue.trim(),
          targetField: targetField.trim(),
          allowedValues: allowedValues
            .split(/[,|;]/)
            .map((s) => s.trim())
            .filter(Boolean),
          action: 'filter',
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Création impossible');
      uxToast.success('Règle SI/ALORS enregistrée');
      setSourceValue('');
      setAllowedValues('');
      await load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!canEdit) return;
    try {
      const r = await fetch(`/api/admin-backoffice/option-dependencies?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Suppression impossible');
      uxToast.success('Dépendance désactivée');
      await load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  if (loading) return <LoadingState message="Chargement des dépendances…" size="sm" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} className="py-8" />;

  return (
    <div className="space-y-4">
      <div className="cps-dep-intro">
        <span className="cps-dep-intro__icon">
          <GitBranch className="h-4 w-4" aria-hidden />
        </span>
        <p className="m-0">
          Moteur de compatibilité : <strong>SI condition ALORS action</strong>. Les cycles et
          auto-dépendances sont refusés à l’enregistrement ; les contradictions afficher/masquer
          sont signalées ci-dessous avant toute activation.
        </p>
      </div>

      {issues.length > 0 ? (
        <ul className="cps-dep-issues" aria-label="Collisions détectées">
          {issues.map((iss, idx) => (
            <li key={`${iss.code}-${idx}`} className={iss.severity === 'error' ? 'is-error' : undefined}>
              <span className="font-semibold">{iss.severity === 'error' ? 'Erreur' : 'Alerte'}</span>
              {' · '}
              {iss.message}
              {iss.articleId ? (
                <>
                  {' '}
                  <code className="cps-pricing-code">{iss.articleId}</code>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canEdit ? (
        <div className="cps-dep-form">
          <p className="cps-dep-form__title">Nouvelle règle SI / ALORS</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="cps-dep-field">
              Article (id)
              <input
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
                placeholder="ex. flyer-a5"
              />
            </label>
            <label className="cps-dep-field">
              SI — champ source
              <input value={sourceField} onChange={(e) => setSourceField(e.target.value)} />
            </label>
            <label className="cps-dep-field">
              SI — valeur source
              <input
                value={sourceValue}
                onChange={(e) => setSourceValue(e.target.value)}
                placeholder="ex. PCB 300g"
              />
            </label>
            <label className="cps-dep-field">
              ALORS — champ cible
              <input value={targetField} onChange={(e) => setTargetField(e.target.value)} />
            </label>
            <label className="cps-dep-field sm:col-span-2">
              Valeurs autorisées (séparées par virgule)
              <input
                value={allowedValues}
                onChange={(e) => setAllowedValues(e.target.value)}
                placeholder="mat, brillant"
              />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <AppButton type="button" variant="default" disabled={saving} onClick={() => void create()}>
              <Plus className="h-3.5 w-3.5" />
              {saving ? 'Enregistrement…' : 'Ajouter la règle'}
            </AppButton>
            <AppButton type="button" variant="outline" onClick={() => void load()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </AppButton>
          </div>
        </div>
      ) : null}

      <div className="cps-dep-toolbar">
        <label className="cps-dep-search">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par article, champ ou valeur…"
            aria-label="Filtrer les dépendances"
          />
        </label>
        <span className="cps-dep-count">
          {filteredRows.length} règle{filteredRows.length > 1 ? 's' : ''}
        </span>
      </div>

      {filteredRows.length === 0 ? (
        <AdminEmptyState
          icon={<GitBranch className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
          title={
            rows.length === 0
              ? 'Aucune dépendance configurée'
              : 'Aucune règle ne correspond au filtre'
          }
          description={
            rows.length === 0
              ? 'Créez une règle SI/ALORS ci-dessus pour contrôler les combinaisons d’options.'
              : 'Modifiez ou effacez le filtre pour retrouver les règles existantes.'
          }
        />
      ) : (
        <ul className="cps-dep-list" aria-label="Dépendances SI / ALORS">
          {filteredRows.map((r) => {
            const allowed = String(r.allowedValues ?? '')
              .split('|')
              .filter(Boolean);
            return (
              <li key={r.id} className="cps-dep-rule">
                <div className="cps-dep-rule__flow">
                  <span className="cps-dep-chip cps-dep-chip--si">SI</span>
                  <span className="cps-dep-rule__cond">
                    {r.sourceField} = <strong>{r.sourceValue}</strong>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="cps-dep-chip cps-dep-chip--alors">ALORS</span>
                  <span className="cps-dep-rule__cond">
                    {actionLabel(r.action)} <strong>{r.targetField}</strong>
                    {allowed.length > 0 ? <> ∈ {'{ '}{allowed.join(', ')}{' }'}</> : null}
                  </span>
                </div>
                <div className="cps-dep-rule__meta">
                  <code className="cps-pricing-code">{r.articleId}</code>
                  {canEdit ? (
                    <AppButton
                      type="button"
                      variant="outline"
                      onClick={() => setRemoveId(r.id)}
                      title="Désactiver la dépendance"
                      aria-label={`Désactiver la dépendance ${r.sourceField} = ${r.sourceValue}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </AppButton>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(open) => {
          if (!open) setRemoveId(null);
        }}
        title="Désactiver cette dépendance ?"
        description="La règle SI/ALORS ne s’appliquera plus au POS. Elle reste réactivable côté données."
        confirmLabel="Désactiver"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={() => {
          if (removeId) void remove(removeId);
          setRemoveId(null);
        }}
      />
    </div>
  );
}
