'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { aggregateMaterialGroups } from '@/lib/backoffice/material-group-aggregate';
import { emptyMaterialExcelTemplate } from '@/lib/backoffice/material-excel-format';
import { exportRowsToXlsx } from '@/lib/admin/excel-table';
import { isMaterialRowToVerify } from '@/lib/backoffice/material-table-fields';
import { BaseMaterialPricesTable } from '@/components/backoffice-v2/pricing-custom/BaseMaterialPricesTable';
import { MaterialFromStockModal } from '@/components/backoffice-v2/pricing-custom/material-prices/MaterialFromStockModal';
import { MaterialsCorbeilleTable } from '@/components/administration/materials/MaterialsCorbeilleTable';
import { MaterialsActionsMenu } from '@/components/administration/materials/MaterialsActionsMenu';
import { AdminTableViewTabs } from '@/components/admin/AdminTableViewTabs';
import { AdminHistoriquePlaceholder } from '@/components/admin/AdminHistoriquePlaceholder';
import type {
  MaterialColumnPresetId,
  MaterialStudioSubViewId,
} from '@/lib/backoffice/material-table-columns';
import type { MaterialFilterChip } from '@/components/backoffice-v2/pricing-custom/material-prices/MaterialTableToolbar';

export type MaterialsViewTab = 'matieres' | 'corbeille' | 'historique';

const NAV_TABS = [
  { id: 'matieres' as const, label: 'Matières' },
  { id: 'corbeille' as const, label: 'Corbeille' },
  { id: 'historique' as const, label: 'Historique' },
];

type Props = {
  canEdit: boolean;
  /** Bannière de contexte quand le workspace est embarqué dans le hub (identité / stock). */
  focusHint?: 'identity' | 'stock' | 'all';
  /** Hub CPS : masque titre, KPI dupliqués et onglets Liste/Corbeille (gérés par le shell). */
  hubEmbedded?: boolean;
  /** Sous-vue studio matières (hub CPS) — préréglage colonnes + filtre. */
  studioSubView?: MaterialStudioSubViewId;
  columnPreset?: MaterialColumnPresetId;
  defaultFilterChip?: MaterialFilterChip;
  onStudioSubViewChange?: (id: MaterialStudioSubViewId) => void;
  /** Déclenche l'ouverture depuis l'action principale du header CPS. */
  createToken?: number;
};

export function MaterialsUnifiedWorkspace({
  canEdit,
  focusHint = 'all',
  hubEmbedded = false,
  studioSubView,
  columnPreset,
  defaultFilterChip = 'all',
  onStudioSubViewChange,
  createToken = 0,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawView = searchParams.get('view');
  const hubTab = searchParams.get('tab');
  const chipParam = searchParams.get('chip');
  const effectiveFilterChip: MaterialFilterChip =
    chipParam === 'missingPrice'
    || chipParam === 'unlinked'
    || chipParam === 'draft'
    || chipParam === 'published'
    || chipParam === 'pos'
    || chipParam === 'verify'
      ? chipParam
      : defaultFilterChip;
  const view: MaterialsViewTab =
    rawView === 'corbeille' || rawView === 'historique' || hubTab === 'corbeille' || hubTab === 'historique'
      ? (rawView === 'corbeille' || hubTab === 'corbeille' ? 'corbeille' : 'historique')
      : 'matieres';

  const [kpis, setKpis] = useState({
    totalBases: 0,
    variants: 0,
    missingPrice: 0,
    toVerify: 0,
    unlinkedStock: 0,
    stockCritical: 0,
    anomalies: 0,
  });
  const [merging, setMerging] = useState(false);
  const [completingCatalog, setCompletingCatalog] = useState(false);
  const [backfillingPrices, setBackfillingPrices] = useState(false);
  const [fromStockOpen, setFromStockOpen] = useState(false);
  const [localCreateToken, setLocalCreateToken] = useState(0);
  const [tableRefreshToken, setTableRefreshToken] = useState(0);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    variant?: 'default' | 'destructive';
    run: () => void | Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (createToken > 0 && canEdit) setLocalCreateToken((n) => n + 1);
  }, [createToken, canEdit]);

  const effectiveCreateToken = localCreateToken;
  const bumpTableRefresh = () => setTableRefreshToken((n) => n + 1);

  const loadKpis = useCallback(async () => {
    try {
      const r = await fetch('/api/admin-backoffice/pricing/base-material-prices', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) return;
      const rows = (d.data.rows ?? []).filter(
        (row: { rowKind?: string; id?: string }) =>
          row.rowKind === 'material'
          && !String(row.id).startsWith('print-')
          && !String(row.id).startsWith('catalog-'),
      );
      const groups = aggregateMaterialGroups(rows);
      setKpis({
        totalBases: groups.length,
        variants: rows.length,
        missingPrice: rows.filter((row: { basePrintPrice?: number | null }) => row.basePrintPrice == null).length,
        toVerify: rows.filter((row: Parameters<typeof isMaterialRowToVerify>[0]) => isMaterialRowToVerify(row)).length,
        unlinkedStock: rows.filter((row: { stockItemId?: string | null }) => !row.stockItemId).length,
        stockCritical: rows.filter((row: {
          stockStatus?: string | null;
          stockThreshold?: number | null;
          stockAvailable?: number | null;
        }) => {
          if (row.stockStatus === 'low' || row.stockStatus === 'rupture' || row.stockStatus === 'critical') return true;
          if (row.stockThreshold != null && row.stockAvailable != null && row.stockAvailable <= row.stockThreshold) return true;
          return false;
        }).length,
        anomalies: rows.reduce((sum: number, row: { anomaliesCount?: number }) => sum + (row.anomaliesCount ?? 0), 0),
      });
    } catch {
      /* KPI optionnels */
    }
  }, []);

  /** Une fois : archive roll-up / stylo / t-shirt… mal placés en matières → Corbeille */
  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/admin-backoffice/pricing/base-material-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'archive-misplaced-finished' }),
        });
        const d = await r.json();
        if (cancelled || !r.ok || !d.ok) return;
        const n = d.data?.archived ?? 0;
        if (n > 0) {
          uxToast.success(`${n} produit(s) fini(s) retirés des matières → Articles finis / Corbeille`);
          setTableRefreshToken((t) => t + 1);
          void loadKpis();
        }
      } catch {
        /* silencieux */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nettoyage unique au montage
  }, [canEdit]);

  useEffect(() => {
    void loadKpis();
  }, [loadKpis]);

  const setView = (tab: MaterialsViewTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', tab);
    // Hub fusionné Catalogue Prix Stock — rester sur studio Matières
    if (pathname.includes('catalogue-prix-stock')) {
      params.set('studio', 'matieres');
      params.set('tab', 'matieres');
      if (tab === 'corbeille') params.set('view', 'corbeille');
      else if (tab === 'historique') params.set('view', 'historique');
      else params.set('view', 'referentiel');
      router.replace(`/administration/catalogue-prix-stock?${params.toString()}`);
      return;
    }
    // Hub fusionné legacy ou page matières
    const base = pathname.includes('prix-matieres-stock')
      ? '/administration/prix-matieres-stock'
      : '/administration/matieres';
    if (base.includes('prix-matieres-stock') && !params.get('tab')) {
      params.set('tab', tab === 'matieres' ? 'matieres' : tab === 'corbeille' ? 'corbeille' : 'historique');
    }
    router.replace(`${base}?${params.toString()}`);
  };

  const cleanDuplicates = async (dryRun = false) => {
    setMerging(true);
    try {
      const r = await fetch('/api/admin-backoffice/materials/clean-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Nettoyage impossible');
      const result = d.data;
      uxToast.success(
        dryRun
          ? `Simulation : ${result.merged} fusion(s) possibles sur ${result.scanned} lignes`
          : `${result.merged} doublon(s) fusionné(s), ${result.archived} archivé(s)`,
      );
      if (!dryRun) {
        void loadKpis();
        bumpTableRefresh();
      }
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur nettoyage');
    } finally {
      setMerging(false);
    }
  };

  const syncPos = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/sync-pos', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) {
      uxToast.error(d?.error?.message ?? d?.error ?? 'Sync POS impossible');
      return;
    }
    if (d.data?.catalog?.ok === false || d.data?.materials?.ok === false) {
      uxToast.error('Sync partielle — le POS n’est pas marqué synchronisé');
      return;
    }
    uxToast.success(d.data?.message ?? 'POS synchronisé');
  };

  /** Analyse idempotente puis confirmation (Ultra-Prompt §8 — pas d’écriture silencieuse). */
  const completeFromCatalog = async () => {
    setCompletingCatalog(true);
    try {
      const analyze = await fetch('/api/admin-backoffice/pricing/base-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-catalog' }),
      });
      const a = await analyze.json();
      if (!analyze.ok || !a.ok) throw new Error(a.error?.message ?? a.error ?? 'Analyse impossible');
      const d = a.data ?? {};
      const created = Number(d.created ?? 0);
      const updated = Number(d.updated ?? 0);
      const skipped = Number(d.skipped ?? 0);
      const sample = Array.isArray(d.sampleCreates)
        ? d.sampleCreates.slice(0, 8).map((x: { label?: string }) => x.label).filter(Boolean).join(', ')
        : '';
      if (created === 0 && updated === 0) {
        uxToast.success(`Rien à compléter — ${skipped} matière(s) déjà présentes`);
        return;
      }
      const previewDescription =
        `• ${created} matière(s) à créer\n`
        + `• ${updated} libellé(s) à normaliser\n`
        + `• ${skipped} déjà présentes (inchangées)\n`
        + (sample ? `\nExemples : ${sample}${created > 8 ? '…' : ''}\n` : '\n')
        + `\nLes prix manuels non vides ne sont pas écrasés.`;
      setPendingConfirm({
        title: 'Appliquer la complétion depuis le catalogue ?',
        description: previewDescription,
        confirmLabel: 'Appliquer',
        run: async () => {
          try {
            const apply = await fetch('/api/admin-backoffice/pricing/base-materials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'apply-catalog' }),
            });
            const applied = await apply.json();
            if (!apply.ok || !applied.ok) {
              throw new Error(applied.error?.message ?? applied.error ?? 'Application impossible');
            }
            uxToast.success(applied.data?.message ?? 'Catalogue appliqué');
            void loadKpis();
            bumpTableRefresh();
          } catch (e) {
            uxToast.error(e instanceof Error ? e.message : 'Complétion catalogue impossible');
          }
        },
      });
      return;
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Complétion catalogue impossible');
    } finally {
      setCompletingCatalog(false);
    }
  };

  const callExcelAction = async (
    url: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> => {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let d: { ok?: boolean; error?: { message?: string } | string; data?: Record<string, unknown> };
      try {
        d = await r.json();
      } catch {
        throw new Error(`Réponse serveur invalide (${r.status})`);
      }
      if (!r.ok || !d.ok) {
        const msg =
          typeof d.error === 'string'
            ? d.error
            : d.error?.message ?? `Erreur serveur (${r.status})`;
        throw new Error(msg);
      }
      bumpTableRefresh();
      void loadKpis();
      return d.data ?? {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action impossible';
      console.error('[Stock & Matières]', url, msg);
      uxToast.error(msg, 'Action impossible');
      return null;
    }
  };

  const generateReferences = async (mode: 'missing' | 'all' = 'missing') => {
    const data = await callExcelAction('/api/admin/stock-matieres/generate-references', { mode });
    if (!data) return;
    const updated = Number(data.updated ?? 0);
    const skipped = Number(data.skipped ?? 0);
    uxToast.success(
      mode === 'all'
        ? `${updated} référence(s) régénérée(s)`
        : `${updated} référence(s) générée(s) · ${skipped} conservée(s)`,
    );
  };

  const reorganizeIds = () => {
    setPendingConfirm({
      title: 'Réorganiser les IDs Excel ?',
      description: 'Réorganiser les IDs Excel (001, 002, 003…) selon l’ordre actuel du tableau.',
      confirmLabel: 'Réorganiser',
      run: async () => {
        const data = await callExcelAction('/api/admin/stock-matieres/reorganize-excel-ids', {});
        if (!data) return;
        uxToast.success(`IDs Excel réorganisés — ${data.reassigned ?? data.assigned ?? 0} ligne(s)`);
      },
    });
  };

  const downloadTemplate = () => {
    const rows = emptyMaterialExcelTemplate();
    exportRowsToXlsx(rows as unknown as Record<string, unknown>[], 'stock-matieres-modele', 'Matières');
    uxToast.success('Modèle Excel téléchargé');
  };

  const exportMissingPrices = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/pricing/base-materials/export-missing-prices', {
        cache: 'no-store',
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error?.message ?? 'Export impossible');
      }
      const blob = await r.blob();
      const count = Number(r.headers.get('X-Orion-Missing-Count') ?? '0');
      const cd = r.headers.get('Content-Disposition') ?? '';
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? 'ans-orion-matieres-prix-manquants.xlsx';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      uxToast.success(
        count > 0
          ? `${count} matière(s) sans prix exportée(s)`
          : 'Aucune matière sans prix — fichier vide',
      );
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Export impossible');
    }
  };

  const backfillPrices = async () => {
    setBackfillingPrices(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/base-materials/backfill-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Backfill impossible');
      const updated = Number(d.data?.updated ?? 0);
      const remaining = Number(d.data?.remaining ?? 0);
      uxToast.success(`${updated} prix base complété(s) · ${remaining} encore manquant(s)`);
      void loadKpis();
      bumpTableRefresh();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Backfill impossible');
    } finally {
      setBackfillingPrices(false);
    }
  };

  return (
    <div className={`space-y-4 min-h-0 flex flex-col${hubEmbedded ? ' cps-hub-embedded' : ''}`}>
      {/* Bandeau toujours visible (y compris hub CPS) — séparation Print O'Clock */}
      <div className="rounded-lg border border-[var(--ans-red)]/35 bg-[var(--ans-red)]/8 px-3 py-2 text-xs md:text-sm">
        <p className="m-0 font-medium text-[var(--text-main)]">
          Matières = supports bruts pour articles complexes
        </p>
        <p className="m-0 mt-0.5 text-muted-foreground">
          Papier intérieur, papier couverture, PCB, PCM, Glossy, kraft, texturé, bâche / vinyle (m²), tissu…
          Ces briques entrent dans la composition d’articles composites (livre, flyer multi-couches, grand format…).
          Produits complets vendus tels quels (Flyer A5, Carte de visite, T-shirt, Roll-up…) →{' '}
          <Link className="underline text-[var(--ans-red)]" href="/administration/prix-articles">
            Articles finis
          </Link>
          {' / '}
          <Link className="underline text-[var(--ans-red)]" href="/pos">
            Catalogue POS
          </Link>
          .
        </p>
      </div>
      {!hubEmbedded ? (
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            ORION · Administration · Matières
          </p>
          <h1 className="text-xl font-bold text-foreground m-0">
            {focusHint === 'stock' ? 'Stock & Achats' : focusHint === 'identity' ? 'Matières' : 'Matières'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {focusHint === 'stock'
              ? 'Quantités, seuils, fournisseurs et unités d’achat — liés à la matière unique (pas de doublon prix).'
              : focusHint === 'identity'
                ? 'Supports bruts (papier intérieur / couverture, PCB, PCM, Glossy, offset, vinyle, bâche…) qui composent les articles complexes (livre, flyer, GF). Les articles simples (T-shirt, Carte de visite…) → Articles finis.'
                : 'Briques de base pour personnaliser d’autres articles (papiers ISF, grand format m²). Produits complets (Flyer, Carte de visite, T-shirt, PLV) → Articles finis / Catalogue POS.'}
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <AppButton type="button" variant="default" className="orion-material-new-btn inline-flex items-center gap-2 text-sm" onClick={() => setLocalCreateToken((n) => n + 1)}
            >
              <Plus className="h-4 w-4" />
              Nouvelle matière
            </AppButton>
            <MaterialsActionsMenu
              canEdit={canEdit}
              merging={merging}
              completingCatalog={completingCatalog}
              onFromStock={() => setFromStockOpen(true)}
              onCompleteFromCatalog={() => void completeFromCatalog()}
              onCleanDuplicates={cleanDuplicates}
              onSyncPos={syncPos}
              onGenerateReferences={generateReferences}
              onReorganizeIds={reorganizeIds}
              onDownloadTemplate={downloadTemplate}
              onExportMissingPrices={() => void exportMissingPrices()}
              onBackfillPrices={() => void backfillPrices()}
              backfillingPrices={backfillingPrices}
            />
          </div>
        ) : null}
      </header>
      ) : null}

      {!hubEmbedded && kpis.missingPrice > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-amber-200 m-0">
              {kpis.missingPrice.toLocaleString('fr-FR')} matière(s) sans prix base
            </p>
            <p className="text-xs text-muted-foreground m-0 mt-0.5">
              Filtrez la liste, complétez depuis ISF/stock, ou exportez Excel pour saisie manuelle.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton type="button" variant="outline" className="text-xs" onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('chip', 'missingPrice');
                router.replace(`${pathname}?${params.toString()}`);
              }}
            >
              Voir sans prix
            </AppButton>
            {canEdit ? (
              <>
                <AppButton type="button" variant="outline" className="text-xs" disabled={backfillingPrices}
                  onClick={() => void backfillPrices()}
                >
                  {backfillingPrices ? 'Complément…' : 'Compléter auto'}
                </AppButton>
                <AppButton type="button" variant="default" className="text-xs" onClick={() => void exportMissingPrices()}
                >
                  Export Excel
                </AppButton>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {!hubEmbedded ? (
      <div className="orion-material-kpi-grid">
        {[
          { id: 'all' as const, label: 'Matières de base', value: kpis.totalBases },
          { id: 'all' as const, label: 'Déclinaisons', value: kpis.variants },
          { id: 'missingPrice' as const, label: 'Prix manquants', value: kpis.missingPrice, warn: kpis.missingPrice > 0 },
          { id: 'verify' as const, label: 'À vérifier', value: kpis.toVerify, warn: kpis.toVerify > 0 },
        ].map((k) => {
          const chipId = k.id;
          const isFilterChip = chipId === 'missingPrice' || chipId === 'verify';
          const isActive = isFilterChip && effectiveFilterChip === chipId;
          return (
          <button
            key={k.label}
            type="button"
            className={`orion-material-kpi-card${'warn' in k && k.warn ? ' is-warn' : ''}${isActive ? ' is-active' : ''}`}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              if (!isFilterChip || effectiveFilterChip === chipId) {
                params.delete('chip');
              } else {
                params.set('chip', chipId);
              }
              router.replace(`${pathname}?${params.toString()}`);
            }}
            title={chipId === 'missingPrice' ? 'Afficher les matières sans prix base' : undefined}
          >
            <strong>{k.value.toLocaleString('fr-FR')}</strong>
            <span>{k.label}</span>
          </button>
          );
        })}
      </div>
      ) : null}

      {!hubEmbedded ? (
      <AdminTableViewTabs
        tabs={NAV_TABS}
        value={view}
        onChange={setView}
        ariaLabel="Navigation matières"
      />
      ) : null}

      {view === 'historique' ? (
        <AdminHistoriquePlaceholder entityLabel="matières" entityCode="BaseMaterial" />
      ) : view === 'corbeille' ? (
        <div className="mt-page flex flex-col gap-3 min-h-0 flex-1">
          {hubEmbedded ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground m-0">
                Matières archivées — restauration possible.
              </p>
              <AppButton type="button" variant="outline" onClick={() => setView('matieres')}>
                Retour aux matières
              </AppButton>
            </div>
          ) : null}
          <MaterialsCorbeilleTable
            canEdit={canEdit}
            onDataChanged={() => {
              void loadKpis();
              bumpTableRefresh();
            }}
          />
        </div>
      ) : (
        <BaseMaterialPricesTable
          canEdit={canEdit}
          embedded
          refreshToken={tableRefreshToken}
          createToken={effectiveCreateToken}
          onDataLoaded={loadKpis}
          columnPreset={columnPreset}
          defaultChip={effectiveFilterChip}
          studioSubView={studioSubView}
          onOpenCorbeille={() => setView('corbeille')}
        />
      )}

      {/* Legacy MaterialCreateManualDialog conservé dans MaterialCreateModal / MaterialNewMaterialMenu fallback — création hub via MaterialSheet. */}

      <MaterialFromStockModal
        open={fromStockOpen}
        onClose={() => setFromStockOpen(false)}
        onImported={() => {
          setFromStockOpen(false);
          void loadKpis();
          bumpTableRefresh();
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        onOpenChange={(next) => {
          if (!next) {
            if (pendingConfirm?.title === 'Appliquer la complétion depuis le catalogue ?') {
              uxToast.info('Complétion annulée — aucune écriture');
            }
            setPendingConfirm(null);
          }
        }}
        title={pendingConfirm?.title ?? ''}
        description={pendingConfirm?.description}
        confirmLabel={pendingConfirm?.confirmLabel}
        variant={pendingConfirm?.variant}
        onConfirm={() => {
          const run = pendingConfirm?.run;
          setPendingConfirm(null);
          void run?.();
        }}
      />
    </div>
  );
}
