'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { uxToast } from '@/lib/ux/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RefreshCw } from 'lucide-react';
import { BackofficeLoading, BackofficeError } from '@/components/admin/pricing-v4/backoffice-panel-state';
import { SectionBlock, SectionStack } from '@/components/ui/section-layout';
import { AppButton } from '@/components/ui/app-ui';

type TransitionRule = {
  id: string;
  entity: string;
  fromStatut: string;
  toStatut: string;
  enabled: boolean;
  module: string | null;
  actionKey: string | null;
};

type WorkflowData = {
  chain: string[];
  transitions: { from: string; to: string; action: string; module: string }[];
  configurableStatuses: { id: string; label: string; entity: string }[];
  registries: Record<string, string[]>;
  commandeTransitionRules: TransitionRule[];
  chainTransitionRules: TransitionRule[];
  source: 'db' | 'code';
};

export function WorkflowStatusPanel() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === 'admin';
  const [data, setData] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/backoffice/workflows');
      const d = await r.json();
      if (r.ok) setData(d);
      else setError(d.error || 'Chargement impossible');
    } catch {
      setError('Erreur réseau');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleRule = async (rule: TransitionRule) => {
    if (!isAdmin) return;
    setSaving(rule.id);
    try {
      const r = await fetch('/api/backoffice/workflows/transitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        uxToast.error((d as { error?: string }).error ?? 'Mise à jour impossible');
        return;
      }
      uxToast.success(rule.enabled ? 'Transition désactivée' : 'Transition activée');
      await load();
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setSaving(null);
    }
  };

  const resetDefaults = async () => {
    if (!isAdmin) return;
    setSaving('reset');
    try {
      const r = await fetch('/api/backoffice/workflows/transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (!r.ok) {
        uxToast.error('Réinitialisation impossible');
        return;
      }
      uxToast.success('Transitions réinitialisées');
      await load();
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <BackofficeLoading message="Chargement flux & statuts…" />;
  }

  if (error || !data) {
    return <BackofficeError message={error ?? 'Données indisponibles'} onRetry={load} />;
  }

  return (
    <SectionStack>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Source : <span className="font-mono font-semibold">{data.source === 'db' ? 'Base de données' : 'Code'}</span>
          {' · '}Les transitions commande actives sont appliquées au workflow runtime.
        </p>
        {isAdmin && (
          <AppButton
            type="button"
            disabled={saving === 'reset'}
            onClick={() => setResetConfirmOpen(true)}
            variant="ghost"
            size="sm"
            className="inline-flex items-center gap-1"
          >
            <RefreshCw size={12} className={saving === 'reset' ? 'animate-spin' : ''} />
            Réinitialiser défauts
          </AppButton>
        )}
      </div>

      <SectionBlock title="Chaîne CRM recommandée">
        <div className="flex flex-wrap gap-1 text-xs">
          {data.chain.map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              <span className="acat-badge acat-badge-active">{step}</span>
              {i < data.chain.length - 1 && <span className="opacity-40">→</span>}
            </span>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Transitions commande (configurables)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left p-1">De</th>
                <th className="text-left p-1">Vers</th>
                {isAdmin && <th className="text-left p-1 w-20">Actif</th>}
              </tr>
            </thead>
            <tbody>
              {data.commandeTransitionRules.map((t) => (
                <tr key={t.id} className={`border-t border-border/40 ${!t.enabled ? 'opacity-50' : ''}`}>
                  <td className="p-1">{t.fromStatut}</td>
                  <td className="p-1">{t.toStatut}</td>
                  {isAdmin && (
                    <td className="p-1">
                      <button
                        type="button"
                        disabled={saving === t.id}
                        onClick={() => void toggleRule(t)}
                        className={`px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                          t.enabled
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-border bg-muted text-muted-foreground'
                        }`}
                        aria-pressed={t.enabled}
                      >
                        {t.enabled ? 'Oui' : 'Non'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionBlock>

      <SectionBlock title="Transitions automatisées (chaîne métier)">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-left p-1">De</th>
              <th className="text-left p-1">Vers</th>
              <th className="text-left p-1">Module</th>
              {isAdmin && <th className="text-left p-1 w-20">Actif</th>}
            </tr>
          </thead>
          <tbody>
            {data.chainTransitionRules.map((t) => (
              <tr key={t.id} className={`border-t border-border/40 ${!t.enabled ? 'opacity-50' : ''}`}>
                <td className="p-1">{t.fromStatut}</td>
                <td className="p-1">{t.toStatut}</td>
                <td className="p-1 font-mono">{t.module ?? '—'}</td>
                {isAdmin && (
                  <td className="p-1">
                    <button
                      type="button"
                      disabled={saving === t.id}
                      onClick={() => void toggleRule(t)}
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                        t.enabled
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-border bg-muted text-muted-foreground'
                      }`}
                      aria-pressed={t.enabled}
                    >
                      {t.enabled ? 'Oui' : 'Non'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </SectionBlock>

      <SectionBlock title="Référentiels statuts">
        <div className="grid gap-4 md:grid-cols-2 text-xs">
          {Object.entries(data.registries).map(([key, values]) => (
            <div key={key}>
              <p className="orion-text-card-title text-muted-foreground mb-1.5 capitalize">{key}</p>
              <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                {values.map((v) => <li key={v}>{v}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </SectionBlock>
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Réinitialiser les transitions ?"
        description="Toutes les transitions seront remises aux valeurs par défaut."
        confirmLabel="Réinitialiser"
        variant="destructive"
        onConfirm={() => {
          setResetConfirmOpen(false);
          void resetDefaults();
        }}
      />
    </SectionStack>
  );
}
