'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, RefreshCw, Save, ExternalLink } from 'lucide-react';
import { OrionPageHeader, OrionEmptyState } from '@/components/orion';
import { AppButton, AppListSkeleton, AppInput } from '@/components/ui/app-ui';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';

type PricingVariableRow = {
  id: string;
  code: string;
  label: string;
  value: string;
  unit: string | null;
  valueType: string;
  version: number;
  updatedAt: string;
};

type DraftMap = Record<string, string>;

export default function AdministrationVariablesPage() {
  const [items, setItems] = useState<PricingVariableRow[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/pricing-variables');
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message ?? json?.error ?? 'Chargement impossible');
      }
      const list = Array.isArray(json.items) ? (json.items as PricingVariableRow[]) : [];
      setItems(list);
      const next: DraftMap = {};
      for (const row of list) next[row.code] = row.value;
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRow = async (code: string) => {
    const value = drafts[code];
    if (value == null) return;
    setSavingCode(code);
    setSaveMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/pricing-variables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, value }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message ?? json?.error ?? 'Enregistrement impossible');
      }
      const item = json.item as PricingVariableRow;
      setItems((prev) => prev.map((r) => (r.code === code ? { ...r, ...item } : r)));
      setDrafts((prev) => ({ ...prev, [code]: item.value }));
      setSaveMsg(`« ${code} » enregistrée`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur d’enregistrement');
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="space-y-4 max-w-[1100px] mx-auto px-4 py-4">
      <OrionPageHeader
        title="Variables tarification"
        description="Source de vérité DB (PricingVariable, scope global) — consommée par POS, devis et formules."
        icon={Layers}
        actions={
          <AppButton type="button" variant="outline" size="sm" onClick={() => void load()} className="gap-2">
            <RefreshCw size={14} /> Actualiser
          </AppButton>
        }
      />

      <FlowPageBanner
        entity="article"
        status="config"
        processStep="Administration → Variables tarification"
        impactedModules={['POS', 'Devis', 'Tarifs', 'Catalogue']}
        nextAction={{
          id: 'pricing-var-edit',
          label: 'Éditer une valeur puis Enregistrer',
          description: 'Les variables actives écrasent systemConfig.global_pricing à la lecture',
          href: '/administration/variables',
          module: 'administration',
          priority: 'medium',
        }}
      />

      <p className="text-xs text-muted-foreground">
        Voir aussi{' '}
        <Link href="/tarifs" className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1">
          Tarifs globaux (legacy) <ExternalLink size={11} />
        </Link>
        {' · '}
        <Link
          href="/administration/catalogue-prix-stock?tab=catalogue&studio=variables"
          className="text-primary underline-offset-2 hover:underline"
        >
          Variables catalogue (chips)
        </Link>
      </p>

      {saveMsg && (
        <div className="text-sm px-3 py-2 rounded-[7px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200">
          {saveMsg}
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center gap-3 text-sm px-3 py-2 rounded-[7px] border border-destructive/30 bg-destructive/10 text-destructive">
          <span className="flex-1">{error}</span>
          <AppButton type="button" variant="outline" size="sm" onClick={() => void load()}>
            Réessayer
          </AppButton>
        </div>
      )}

      {loading ? (
        <AppListSkeleton rows={8} />
      ) : items.length === 0 ? (
        <OrionEmptyState
          icon={Layers}
          title="Aucune variable globale"
          description="Lancez une sync tarification dynamique pour seed TVA, production, livraison et coeffs face/finition."
          action={
            <AppButton type="button" onClick={() => void load()}>
              Réessayer
            </AppButton>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[7px] border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 font-semibold">Code</th>
                <th className="px-3 py-2.5 font-semibold">Libellé</th>
                <th className="px-3 py-2.5 font-semibold w-[160px]">Valeur</th>
                <th className="px-3 py-2.5 font-semibold w-[72px]">Unité</th>
                <th className="px-3 py-2.5 font-semibold w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const dirty = drafts[row.code] !== row.value;
                return (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.code}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
                    <td className="px-3 py-2">
                      <AppInput
                        value={drafts[row.code] ?? ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [row.code]: e.target.value }))
                        }
                        className="h-9 rounded-[7px] font-mono text-sm"
                        aria-label={`Valeur ${row.code}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {row.unit || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <AppButton
                        type="button"
                        size="sm"
                        disabled={!dirty || savingCode === row.code}
                        onClick={() => void saveRow(row.code)}
                        className="gap-1.5"
                      >
                        <Save size={13} />
                        {savingCode === row.code ? '…' : 'Enregistrer'}
                      </AppButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
