'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uxToast } from '@/lib/ux/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Hit = {
  severity: string;
  kind: string;
  articleId: string;
  label: string;
  suggestedPrimary: string | null;
  status: string;
  active: boolean;
};

type Props = {
  canEdit: boolean;
  onMerged?: () => void;
  onSyncPos?: () => void;
};

export function CatalogueAnomaliesPanel({ canEdit, onMerged, onSyncPos }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [critical, setCritical] = useState(0);
  const [warns, setWarns] = useState(0);
  const [visible, setVisible] = useState<number | string>('—');
  const [hits, setHits] = useState<Hit[]>([]);
  const [counters, setCounters] = useState<Array<{ categoryId: string; label: string; count: number }>>([]);
  const [posTotal, setPosTotal] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dupRes, idxRes] = await Promise.all([
        fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'detect-duplicates' }),
        }),
        fetch('/api/admin-backoffice/pos-catalog-index', { cache: 'no-store' }),
      ]);
      const dup = await dupRes.json();
      if (dupRes.ok && dup.ok) {
        setCritical(dup.data?.critical ?? 0);
        setWarns(dup.data?.warns ?? 0);
        setVisible(dup.data?.visiblePublishedEstimate ?? '—');
        setHits(Array.isArray(dup.data?.hits) ? dup.data.hits : []);
      }
      if (idxRes.ok) {
        const idx = await idxRes.json();
        if (idx.ok) {
          setCounters(idx.data?.categories ?? []);
          setPosTotal(idx.data?.totalArticles ?? null);
        }
      }
    } catch {
      uxToast.error('Chargement anomalies impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function executeAction(action: string) {
    if (!canEdit) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Action impossible');
      uxToast.success(
        action.includes('merge')
          ? `Fusion OK — ${d.data?.archived ?? d.data?.merged ?? 0} traité(s)`
          : 'Action terminée',
      );
      await load();
      onMerged?.();
      onSyncPos?.();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  function askAction(
    action: string,
    title: string,
    description: string,
    variant?: 'default' | 'destructive',
  ) {
    if (!canEdit) return;
    setPendingAction({ action, title, description, variant });
  }

  async function rebuildIndex() {
    if (!canEdit) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin-backoffice/pos-catalog-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rebuild' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Rebuild impossible');
      uxToast.success(`Index POS reconstruit — ${d.data?.totalArticles ?? '?'} articles`);
      await load();
      onSyncPos?.();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Rebuild impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Anomalies &amp; Doublons catalogue
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Détection Bob/Casquette personnalisés, variantes format/diamètre, dérives compteurs POS Commercial.
            Véracité des prix : voir aussi l&apos;onglet <strong>Catalogue 2026</strong> (Base Prix → Catalogue 2026).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading || busy} onClick={() => void load()}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Critiques (visibles)" value={critical} warn={critical > 0} />
        <Stat label="Avertissements" value={warns} />
        <Stat label="Profils publiés estimés" value={visible} />
        <Stat label="Articles POS Commercial" value={posTotal ?? '—'} />
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() =>
              askAction(
                'merge-personalized-duplicates',
                'Fusionner les doublons personnalisés ?',
                'Fusionner les doublons « personnalisé » (Bob, Casquette, Polo…) vers les articles catalogue.',
                'destructive',
              )
            }
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Fusionner personnalisés
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              askAction(
                'merge-variant-cards',
                'Fusionner les variantes ?',
                'Fusionner les variantes (spirales, collage, PVC…) vers les cartes principales.',
                'destructive',
              )
            }
          >
            Fusionner variantes
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void rebuildIndex()}>
            Rebuild index + compteurs
          </Button>
        </div>
      )}

      {counters.length > 0 && (
        <div className="rounded-lg border overflow-auto max-h-40">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 sticky top-0">
              <tr className="text-left">
                <th className="p-2">Catégorie POS</th>
                <th className="p-2 text-right">Articles</th>
              </tr>
            </thead>
            <tbody>
              {counters.map((c) => (
                <tr key={c.categoryId} className="border-t border-border/40">
                  <td className="p-2">{c.label}</td>
                  <td className="p-2 text-right tabular-nums">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border overflow-auto max-h-[40vh]">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 sticky top-0">
            <tr className="text-left">
              <th className="p-2">Sévérité</th>
              <th className="p-2">Type</th>
              <th className="p-2">Article</th>
              <th className="p-2">Canonique suggéré</th>
              <th className="p-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">Chargement…</td>
              </tr>
            ) : hits.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Aucun doublon détecté.
                </td>
              </tr>
            ) : (
              hits.map((h) => (
                <tr key={`${h.kind}-${h.articleId}`} className="border-t border-border/40">
                  <td className="p-2">
                    <span className={h.severity === 'critical' ? 'text-primary font-medium' : ''}>
                      {h.severity}
                    </span>
                  </td>
                  <td className="p-2 text-xs">{h.kind}</td>
                  <td className="p-2">
                    <div className="font-medium">{h.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">{h.articleId}</div>
                  </td>
                  <td className="p-2 font-mono text-xs">{h.suggestedPrimary ?? '—'}</td>
                  <td className="p-2 text-xs">{h.status}{h.active ? ' · actif' : ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(pendingAction)}
        onOpenChange={(next) => {
          if (!next) setPendingAction(null);
        }}
        title={pendingAction?.title ?? ''}
        description={pendingAction?.description}
        confirmLabel="Confirmer"
        variant={pendingAction?.variant}
        onConfirm={() => {
          const action = pendingAction?.action;
          setPendingAction(null);
          if (action) void executeAction(action);
        }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${warn ? 'border-primary/40 bg-primary/5' : ''}`}>
      <div className={`text-lg font-semibold tabular-nums ${warn ? 'text-primary' : ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
