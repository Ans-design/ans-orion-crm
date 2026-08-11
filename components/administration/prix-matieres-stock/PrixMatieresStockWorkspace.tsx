'use client';

/**
 * Hub Base Prix, Matières & Stock — onglets métier, même base relationnelle.
 * Réutilise les workspaces existants (zéro suppression).
 */
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { uxToast } from '@/lib/ux/feedback';
import {
  InlineEditableCell,
  MarginIndicator,
  computeMarginPct,
  SmartDataGrid,
} from '@/components/admin/catalogue-prix-stock';
import '@/components/backoffice-v2/admin-backoffice.css';

export type PrixMatieresStockTab =
  | 'vue'
  | 'matieres'
  | 'prix-contexte'
  | 'stock'
  | 'prix-base' // alias legacy → matieres
  | 'isf'
  | 'flyers'
  | 'carterie'
  | 'publications'
  | 'grand-format'
  | 'avd'
  | 'finitions'
  | 'paliers'
  | 'regles'
  | 'excel'
  | 'anomalies'
  | 'catalogue-2026'
  | 'diagnostic-prix'
  | 'corbeille'
  | 'historique';

const TABS: { id: PrixMatieresStockTab; label: string }[] = [
  { id: 'vue', label: 'Vue globale' },
  { id: 'matieres', label: 'Matières' },
  { id: 'prix-contexte', label: 'Prix par contexte' },
  { id: 'stock', label: 'Stock & Achats' },
  { id: 'isf', label: 'Impression petit format' },
  { id: 'flyers', label: 'Flyers (ISF + pliage)' },
  { id: 'carterie', label: 'Carterie (imposition)' },
  { id: 'publications', label: 'Livres & Calendriers' },
  { id: 'grand-format', label: 'Impression grand format' },
  { id: 'avd', label: 'Articles vente directe' },
  { id: 'finitions', label: 'Finitions & Façonnage' },
  { id: 'paliers', label: 'Paliers & Remises' },
  { id: 'regles', label: 'Règles & Formules' },
  { id: 'excel', label: 'Import / Export Excel' },
  { id: 'anomalies', label: 'Anomalies & Doublons' },
  { id: 'catalogue-2026', label: '📋 Catalogue 2026' },
  { id: 'diagnostic-prix', label: '🔍 Diagnostic prix' },
];

/** Alias URL : prix-base = matières ; corbeille/historique → sous-vues matières. */
function resolveHubTab(raw: string): PrixMatieresStockTab {
  if (raw === 'prix-base') return 'matieres';
  if (raw === 'corbeille' || raw === 'historique') return 'matieres';
  if (TABS.some((t) => t.id === raw)) return raw as PrixMatieresStockTab;
  return 'vue';
}

const Loading = () => <LoadingState message="Chargement…" size="sm" />;

const MaterialsUnifiedWorkspace = dynamic(
  () => import('@/components/administration/materials/MaterialsUnifiedWorkspace').then((m) => m.MaterialsUnifiedWorkspace),
  { loading: Loading, ssr: false },
);
const ImpressionSfWorkspace = dynamic(
  () => import('@/components/administration/pricing-rules/ImpressionSfWorkspace').then((m) => m.ImpressionSfWorkspace),
  { loading: Loading, ssr: false },
);
const FlyerPricingWorkspace = dynamic(
  () => import('@/components/administration/pricing-rules/FlyerPricingWorkspace').then((m) => m.FlyerPricingWorkspace),
  { loading: Loading, ssr: false },
);
const CarteriePricingWorkspace = dynamic(
  () => import('@/components/administration/pricing-rules/CarteriePricingWorkspace').then((m) => m.CarteriePricingWorkspace),
  { loading: Loading, ssr: false },
);
const PublicationPricingWorkspace = dynamic(
  () =>
    import('@/components/administration/pricing-rules/PublicationPricingWorkspace').then(
      (m) => m.PublicationPricingWorkspace,
    ),
  { loading: Loading, ssr: false },
);
const DirectSaleWorkspace = dynamic(
  () => import('@/components/administration/direct-sale/DirectSaleWorkspace').then((m) => m.DirectSaleWorkspace),
  { loading: Loading, ssr: false },
);
const DirectSaleTiersWorkspace = dynamic(
  () => import('@/components/administration/direct-sale/DirectSaleTiersWorkspace').then((m) => m.DirectSaleTiersWorkspace),
  { loading: Loading, ssr: false },
);
const MaterialRulesWorkspace = dynamic(
  () => import('@/components/administration/pricing-rules/MaterialRulesWorkspace').then((m) => m.MaterialRulesWorkspace),
  { loading: Loading, ssr: false },
);
const PriceTableWorkspace = dynamic(
  () => import('@/components/administration/direct-sale/PriceTableWorkspace').then((m) => m.PriceTableWorkspace),
  { loading: Loading, ssr: false },
);
const Catalogue2026AuditPanel = dynamic(
  () =>
    import('@/components/admin/pricing-v4/panels/catalogue-2026-audit-panel').then(
      (m) => m.Catalogue2026AuditPanel,
    ),
  { loading: Loading, ssr: false },
);
const PrixDiagnosticPanel = dynamic(
  () =>
    import('@/components/administration/prix-matieres-stock/PrixDiagnosticPanel').then(
      (m) => m.PrixDiagnosticPanel,
    ),
  { loading: Loading, ssr: false },
);

type Drift = {
  kind: string;
  severity: string;
  message: string;
  leftPrice?: number | null;
  rightPrice?: number | null;
  leftSource?: string;
  rightSource?: string;
};

function useCanEdit() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === 'admin' || role === 'manager' || role === 'direction';
}

export function PrixMatieresStockWorkspace({
  embedded = false,
  forcedTab,
}: {
  /** Masque le header/nav du hub quand embarqué dans Catalogue, Prix & Stock */
  embedded?: boolean;
  /** Force un onglet (URL parent gère la navigation) */
  forcedTab?: PrixMatieresStockTab;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canEdit = useCanEdit();
  const raw = forcedTab || searchParams.get('tab') || 'vue';
  const tab = resolveHubTab(raw);

  useEffect(() => {
    if (embedded || forcedTab) return;
    const rawTab = searchParams.get('tab');
    if (rawTab === 'prix-base' || rawTab === 'corbeille' || rawTab === 'historique') {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'matieres');
      if (rawTab === 'corbeille' || rawTab === 'historique') params.set('view', rawTab);
      router.replace(`/administration/prix-matieres-stock?${params.toString()}`, { scroll: false });
    }
  }, [raw, router, searchParams, embedded, forcedTab]);

  const setTab = (id: PrixMatieresStockTab) => {
    if (embedded) return; // navigation gérée par le parent
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id === 'prix-base' ? 'matieres' : id);
    router.replace(`/administration/prix-matieres-stock?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <>
          <header className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Base Prix, Matières & Stock</h1>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Source centrale : une matière = une identité · prix par contexte d’usage · stock & achats séparés ·
              Catalogue POS = structure commerciale · POS Commercial synchronisé automatiquement.
            </p>
          </header>

          <nav className="orion-admin-hub-tabs" aria-label="Onglets Base Prix">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={tab === t.id ? 'active' : undefined}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </>
      )}

      <Suspense fallback={<Loading />}>
        <TabBody tab={tab} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

function TabBody({ tab, canEdit }: { tab: PrixMatieresStockTab; canEdit: boolean }) {
  switch (tab) {
    case 'vue':
      return <VueGlobalePanel canEdit={canEdit} />;
    case 'matieres':
    case 'prix-base':
      return <MaterialsUnifiedWorkspace canEdit={canEdit} focusHint="identity" />;
    case 'prix-contexte':
      return <PrixContextePanel canEdit={canEdit} />;
    case 'stock':
      return <MaterialsUnifiedWorkspace canEdit={canEdit} focusHint="stock" />;
    case 'isf':
      return <ImpressionSfWorkspace canEdit={canEdit} />;
    case 'flyers':
      return <FlyerPricingWorkspace canEdit={canEdit} />;
    case 'carterie':
      return <CarteriePricingWorkspace canEdit={canEdit} />;
    case 'publications':
      return <PublicationPricingWorkspace canEdit={canEdit} />;
    case 'grand-format':
      return <GrandFormatEmbed canEdit={canEdit} />;
    case 'avd':
      return <DirectSaleWorkspace canEdit={canEdit} />;
    case 'finitions':
      return <FinitionsEmbed canEdit={canEdit} />;
    case 'paliers':
      return <DirectSaleTiersWorkspace canEdit={canEdit} />;
    case 'regles':
      return <MaterialRulesWorkspace canEdit={canEdit} initialKind="equivalences" />;
    case 'excel':
      return <ExcelPanel canEdit={canEdit} />;
    case 'anomalies':
      return <AnomaliesPanel canEdit={canEdit} />;
    case 'catalogue-2026':
      return <Catalogue2026Panel canEdit={canEdit} />;
    case 'diagnostic-prix':
      return <PrixDiagnosticPanel />;
    case 'corbeille':
    case 'historique':
      return <MaterialsUnifiedWorkspace canEdit={canEdit} focusHint="identity" />;
    default:
      return <VueGlobalePanel canEdit={canEdit} />;
  }
}

const CONTEXT_LABELS: Record<string, string> = {
  RAW_STOCK: 'Achat stock',
  PRINT_SMALL_FORMAT: 'Impression petit format',
  PRINT_GRAND_FORMAT: 'Impression grand format',
  BLANK_MATERIAL: 'Matière vierge',
  PHOTO_PRINT: 'Photo',
  PVC_RIGID: 'PVC / plaque',
  DIRECT_COMPONENT: 'Composant article direct',
};

function PrixContextePanel({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      materialKey: string;
      priceContext: string;
      priceUnit: string;
      baseFormat: string | null;
      priceHT: number;
      costHT: number | null;
      sourceTable: string | null;
    }>
  >([]);
  const [filter, setFilter] = useState('');
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ kind: 'context-prices' });
    if (context) q.set('context', context);
    const res = await fetch(`/api/admin-backoffice/pricing/base-prix-matieres?${q}`);
    const json = await res.json();
    if (json.ok) setRows(json.data.rows ?? []);
  }, [context]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.materialKey.toLowerCase().includes(q)
        || r.priceContext.toLowerCase().includes(q)
        || (r.baseFormat ?? '').toLowerCase().includes(q),
    );
  }, [rows, filter]);

  async function syncPos() {
    if (!canEdit) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin-backoffice/sync-pos', { method: 'POST' });
      const json = await res.json();
      setMsg(json.ok ? (json.data?.message ?? 'POS synchronisé') : (json.error?.message ?? 'Erreur sync'));
    } finally {
      setBusy(false);
    }
  }

  const savePrice = useCallback(async (
    row: (typeof rows)[0],
    patch: { priceHT?: number; costHT?: number | null },
  ) => {
    const r = await fetch('/api/admin-backoffice/pricing/base-prix-matieres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-context-price', id: row.id, ...patch }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'MAJ impossible');
    uxToast.success('Prix contexte mis à jour');
    await load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        id: 'material',
        header: 'Matière',
        priority: 'high' as const,
        sortable: true,
        sortValue: (r: (typeof rows)[0]) => r.materialKey,
        render: (r: (typeof rows)[0]) => <span className="font-mono text-xs">{r.materialKey}</span>,
      },
      {
        id: 'context',
        header: 'Contexte',
        priority: 'high' as const,
        sortable: true,
        sortValue: (r: (typeof rows)[0]) => r.priceContext,
        render: (r: (typeof rows)[0]) => CONTEXT_LABELS[r.priceContext] ?? r.priceContext,
      },
      {
        id: 'unit',
        header: 'Unité',
        priority: 'medium' as const,
        render: (r: (typeof rows)[0]) => r.priceUnit,
      },
      {
        id: 'format',
        header: 'Format',
        priority: 'low' as const,
        render: (r: (typeof rows)[0]) => r.baseFormat ?? '—',
      },
      {
        id: 'priceHT',
        header: 'Prix HT',
        priority: 'high' as const,
        align: 'right' as const,
        sortable: true,
        sortValue: (r: (typeof rows)[0]) => r.priceHT,
        render: (r: (typeof rows)[0]) => (
          <InlineEditableCell
            type="number"
            value={r.priceHT}
            canEdit={canEdit}
            displayClassName="font-mono text-xs tabular-nums"
            formatDisplay={(v) => Number(v).toLocaleString('fr-FR')}
            onSave={async (next) => {
              await savePrice(r, { priceHT: Number(next) });
            }}
          />
        ),
      },
      {
        id: 'cost',
        header: 'Coût',
        priority: 'medium' as const,
        align: 'right' as const,
        render: (r: (typeof rows)[0]) => (
          <InlineEditableCell
            type="number"
            value={r.costHT ?? 0}
            canEdit={canEdit}
            displayClassName="font-mono text-xs tabular-nums text-gray-600"
            formatDisplay={(v) =>
              r.costHT == null && Number(v) === 0 ? '—' : Number(v).toLocaleString('fr-FR')
            }
            onSave={async (next) => {
              await savePrice(r, { costHT: Number(next) });
            }}
          />
        ),
      },
      {
        id: 'margin',
        header: 'Marge',
        priority: 'medium' as const,
        align: 'right' as const,
        render: (r: (typeof rows)[0]) => (
          <MarginIndicator marginPct={computeMarginPct(r.priceHT, r.costHT ?? 0)} />
        ),
      },
      {
        id: 'source',
        header: 'Source',
        priority: 'low' as const,
        render: (r: (typeof rows)[0]) => (
          <span className="text-xs text-gray-500">{r.sourceTable ?? '—'}</span>
        ),
      },
    ],
    [canEdit, savePrice],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-[7px] border border-[var(--cps-border)] bg-[var(--cps-surface)] p-4 text-sm space-y-1">
        <p className="font-medium text-[var(--cps-title)]">Prix par contexte</p>
        <p className="text-[var(--cps-muted)]">
          Une matière peut avoir plusieurs prix selon l&apos;usage — sans dupliquer la matière.
          Source : <code className="text-xs">MaterialContextPrice</code>. Double-clic Prix / Coût pour éditer.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="cps-input min-w-[200px] max-w-xs"
          placeholder="Rechercher matière / format…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="cps-input max-w-[220px]"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        >
          <option value="">Tous les contextes</option>
          {Object.entries(CONTEXT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={() => void load()}>Actualiser</Button>
        {canEdit && (
          <Button type="button" disabled={busy} onClick={() => void syncPos()}>
            Synchroniser POS
          </Button>
        )}
      </div>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <SmartDataGrid
        rows={filtered.slice(0, 500)}
        columns={columns}
        searchPlaceholder="Filtrer dans la grille…"
        getSearchBlob={(r) =>
          `${r.materialKey} ${r.priceContext} ${r.baseFormat ?? ''} ${r.priceUnit}`
        }
        emptyTitle="Aucun prix contexte — lancez « Migrer vers source unique » dans Vue globale."
      />
      {filtered.length > 500 && (
        <p className="text-xs text-muted-foreground">Affichage limité à 500 lignes — affinez le filtre.</p>
      )}
    </div>
  );
}


function GrandFormatEmbed({ canEdit }: { canEdit: boolean }) {
  const [cols, setCols] = useState<readonly string[] | null>(null);
  useEffect(() => {
    void import('@/lib/backoffice/pricing-tables-excel-format').then((m) => {
      setCols(m.GRAND_FORMAT_EXCEL_COLUMNS);
    });
  }, []);
  if (!cols) return <Loading />;
  return (
    <PriceTableWorkspace
      title="Grand format — tarification"
      description="Vue calculée sur MaterialContextPrice / GrandFormatPricing liés à BaseMaterial."
      apiPath="/api/admin-backoffice/direct-sale/grand-format"
      excelColumns={cols}
      excelSheetName="Grand format"
      exportFileStem="grand-format-prix"
      nameKey="name"
      priceKey="pricePerM2"
      canEdit={canEdit}
      enableBackfillFromPos
      backfillLabel="Compléter Grand Format depuis POS"
    />
  );
}

function FinitionsEmbed({ canEdit }: { canEdit: boolean }) {
  const [cols, setCols] = useState<readonly string[] | null>(null);
  useEffect(() => {
    void import('@/lib/backoffice/pricing-tables-excel-format').then((m) => {
      setCols(m.FINISHING_EXCEL_COLUMNS);
    });
  }, []);
  if (!cols) return <Loading />;
  return (
    <PriceTableWorkspace
      title="Finitions & Reliures"
      description="Prestations façonnage uniquement — coins, collage, découpe, dorure, reliures… Sync Admin → POS."
      apiPath="/api/admin-backoffice/direct-sale/finishing"
      excelColumns={cols}
      excelSheetName="Finitions"
      exportFileStem="finitions-reliures"
      nameKey="name"
      priceKey="unitPrice"
      canEdit={canEdit}
      enableBackfillFromPos
      backfillLabel="Compléter Finitions depuis catalogue"
    />
  );
}

function VueGlobalePanel({ canEdit }: { canEdit: boolean }) {
  const [stats, setStats] = useState<{ contextSmallFormat: number; contextGrandFormat: number; drifts: number; driftErrors: number } | null>(null);
  const [cat2026, setCat2026] = useState<{ matchOk: number; withExcelPrice: number; prixDivergent: number; sansTarif2026: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch('/api/admin-backoffice/pricing/base-prix-matieres?kind=overview'),
      fetch('/api/admin-backoffice/pricing/catalogue-2026/audit').catch(() => null),
    ]);
    const json = await r1.json();
    if (json.ok) setStats(json.data.stats);
    if (r2?.ok) {
      const j2 = await r2.json();
      if (j2.ok) setCat2026(j2.data?.summary ?? null);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function migrate() {
    if (!canEdit) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/base-prix-matieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' }),
      });
      const json = await res.json();
      setMsg(json.ok
        ? `Migration OK — ISF ${json.data.smallFormatPrices}, GF ${json.data.grandFormatPrices}, drifts ${json.data.drifts?.length ?? 0}`
        : (json.error ?? 'Erreur'));
      await load();
    } finally {
      setBusy(false);
    }
  }

  const cat2026Pct =
    cat2026 && cat2026.withExcelPrice > 0
      ? Math.round((cat2026.matchOk / cat2026.withExcelPrice) * 100)
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Prix petit format (contexte)" value={stats?.contextSmallFormat ?? '—'} />
        <Stat label="Prix grand format (contexte)" value={stats?.contextGrandFormat ?? '—'} />
        <Stat label="Anomalies" value={stats?.drifts ?? '—'} />
        <Stat label="Divergences" value={stats?.driftErrors ?? '—'} warn={(stats?.driftErrors ?? 0) > 0} />
      </div>
      {cat2026 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Catalogue 2026 — alignés" value={cat2026Pct != null ? `${cat2026Pct}%` : '—'} />
          <Stat label="Matières avec prix Excel" value={cat2026.withExcelPrice} />
          <Stat label="Écarts prix 2026" value={cat2026.prixDivergent} warn={cat2026.prixDivergent > 0} />
          <Stat label="Sans tarif 2026" value={cat2026.sansTarif2026} />
        </div>
      )}
      <div className="rounded-[var(--radius-ui,12px)] border-0 bg-[var(--bg-card)] p-4 text-sm space-y-2 shadow-[var(--shadow-card)] text-[var(--text-main)]">
        <p><strong>Matières</strong> = identité (nom, famille, grammage, unité, statut).</p>
        <p><strong>Prix par contexte</strong> = MaterialContextPrice (achat, ISF, GF, photo…).</p>
        <p><strong>Stock & Achats</strong> = quantités, seuils, fournisseurs.</p>
        <p><strong>Catalogue POS</strong> = structure commerciale · <strong>POS</strong> = pricingResolver.</p>
      </div>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {canEdit && (
        <div className="flex flex-wrap gap-2.5">
          <Button type="button" disabled={busy} onClick={() => void migrate()}>
            Migrer vers source unique
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void fetch('/api/admin-backoffice/pricing/base-prix-matieres', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'rebuild' }),
            }).then(() => setMsg('Index POS reconstruit'))}
          >
            Rebuild index POS
          </Button>
        </div>
      )}
    </div>
  );
}

type Ref2026Row = { excelRowId: string; materialName: string; status: string; message: string };

function AnomaliesPanel({ canEdit }: { canEdit: boolean }) {
  const [drifts, setDrifts] = useState<Drift[]>([]);
  const [categoryAnoms, setCategoryAnoms] = useState<
    Array<{ severity: string; kind: string; message: string; articleId: string; suggestedFamily: string }>
  >([]);
  const [ref2026Rows, setRef2026Rows] = useState<Ref2026Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [res, catRes, r2026] = await Promise.all([
      fetch('/api/admin-backoffice/pricing/base-prix-matieres?kind=drifts'),
      fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'repair-categories', dryRun: true }),
      }).catch(() => null),
      fetch('/api/admin-backoffice/pricing/catalogue-2026/audit').catch(() => null),
    ]);
    const json = await res.json();
    if (json.ok) setDrifts(json.data.drifts ?? []);
    if (catRes) {
      const cj = await catRes.json();
      if (cj.ok && Array.isArray(cj.data?.rows)) {
        setCategoryAnoms(
          cj.data.rows
            .filter((r: { source?: string }) => r.source === 'profile')
            .map((r: { articleId: string; label: string; oldFamily: string | null; newFamily: string; issues?: Array<{ message: string }> }) => ({
              severity: 'warning',
              kind: 'misclassified_category',
              message:
                r.issues?.[0]?.message
                ?? `${r.label} est dans ${r.oldFamily ?? '—'}, catégorie suggérée : ${r.newFamily}`,
              articleId: r.articleId,
              suggestedFamily: r.newFamily,
            })),
        );
      }
    }
    if (r2026?.ok) {
      const j2 = await r2026.json();
      if (j2.ok && Array.isArray(j2.data?.divergences)) {
        setRef2026Rows(
          (j2.data.divergences as Ref2026Row[]).filter(
            (r) => r.status === 'sans_tarif_2026' || r.status === 'prix_divergent' || r.status === 'prix_manquant_db',
          ),
        );
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dups = useMemo(() => drifts.filter((d) => d.kind === 'duplicate_material'), [drifts]);

  async function merge(dryRun: boolean) {
    if (!canEdit) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/base-prix-matieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge-duplicates', dryRun }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMsg(json.error ?? 'Erreur');
        return;
      }
      const m = json.data.merge;
      setMsg(
        dryRun
          ? `Simulation : ${m?.groupsFound ?? 0} groupes, ${m?.merged ?? 0} fusions potentielles`
          : `Fusion : ${m?.merged ?? 0} fusionnés, ${m?.archived ?? 0} archivés`,
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function repairCategories() {
    if (!canEdit) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'repair-categories' }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMsg(json.error?.message ?? 'Erreur réparation catégories');
        return;
      }
      setMsg(`Catégories réparées : ${json.data?.repaired ?? 0}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function exportRapport() {
    const res = await fetch('/api/admin-backoffice/pricing/prix-matieres-stock/export-excel');
    if (!res.ok) {
      setMsg('Export rapport indisponible');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anomalies-prix-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Rapport anomalies exporté (feuille 10_Anomalies)');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void load()}>Actualiser</Button>
        <Button type="button" variant="outline" onClick={() => void exportRapport()}>
          Export rapport anomalies
        </Button>
        {canEdit && (
          <>
            <Button type="button" variant="outline" disabled={busy || dups.length === 0} onClick={() => void merge(true)}>
              Simuler nettoyage
            </Button>
            <Button type="button" disabled={busy || dups.length === 0} onClick={() => void merge(false)}>
              Fusionner les doublons
            </Button>
            <Button type="button" variant="outline" disabled={busy || categoryAnoms.length === 0} onClick={() => void repairCategories()}>
              Réparer catégories POS
            </Button>
          </>
        )}
      </div>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {categoryAnoms.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <p className="px-3 py-2 text-xs font-semibold uppercase text-amber-700 bg-amber-50">
            Article mal catégorisé ({categoryAnoms.length})
          </p>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Sévérité', 'Type', 'Message', 'Article', 'Suggéré'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoryAnoms.map((d) => (
                <tr key={d.articleId} className="border-t">
                  <td className="px-3 py-2 text-amber-600">{d.severity}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.kind}</td>
                  <td className="px-3 py-2">{d.message}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.articleId}</td>
                  <td className="px-3 py-2">{d.suggestedFamily}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ref2026Rows.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <p className="px-3 py-2 text-xs font-semibold uppercase text-blue-700 bg-blue-50">
            Référentiel Catalogue 2026 — écarts &amp; sans tarif ({ref2026Rows.length})
          </p>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['ID Excel', 'Matière', 'Statut', 'Message'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ref2026Rows.map((r) => (
                <tr key={`${r.excelRowId}-${r.status}`} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.excelRowId}</td>
                  <td className="px-3 py-2">{r.materialName}</td>
                  <td className={`px-3 py-2 text-xs ${r.status === 'prix_divergent' ? 'text-amber-600' : r.status === 'sans_tarif_2026' ? 'text-blue-600' : 'text-red-600'}`}>{r.status}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {drifts.length === 0 && categoryAnoms.length === 0 && ref2026Rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune anomalie détectée.</p>
      ) : drifts.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Sévérité', 'Type', 'Message', 'Gauche', 'Droite'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drifts.map((d, i) => (
                <tr key={`${d.kind}-${i}`} className="border-t">
                  <td className={`px-3 py-2 ${d.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}>{d.severity}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.kind}</td>
                  <td className="px-3 py-2">{d.message}</td>
                  <td className="px-3 py-2 text-muted-foreground">{d.leftPrice != null ? `${d.leftPrice}` : '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{d.rightPrice != null ? `${d.rightPrice}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ExcelPanel({ canEdit }: { canEdit: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    totals: { read: number; created: number; updated: number; skipped: number; errors: number };
    reports: Array<{
      sheet: string;
      read: number;
      created: number;
      updated: number;
      skipped: number;
      errors: Array<{ line: number; reason: string }>;
    }>;
    message?: string;
    critical?: boolean;
  } | null>(null);

  async function downloadTemplate() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/prix-matieres-stock/export-excel?template=1');
      if (!res.ok) {
        setMsg('Modèle Excel indisponible');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modele-prix-matieres-stock-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Modèle Excel téléchargé (00_Guide + exemples 01–13)');
    } catch {
      setMsg('Erreur téléchargement modèle');
    } finally {
      setBusy(false);
    }
  }

  async function exportComplet() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/prix-matieres-stock/export-excel');
      if (!res.ok) {
        setMsg('Export indisponible — utilisez l’export par onglet (Matières, ISF, GF…).');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prix-matieres-stock-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Export multi-feuilles téléchargé');
    } catch {
      setMsg('Erreur export — utilisez les exports par onglet.');
    } finally {
      setBusy(false);
    }
  }

  async function previewImport(file: File) {
    if (!canEdit) return;
    setBusy(true);
    setMsg(null);
    setPreview(null);
    setPendingFile(file);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('dryRun', '1');
      const res = await fetch('/api/admin-backoffice/pricing/prix-matieres-stock/import-excel', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!json.ok) {
        setMsg(json.error ?? 'Prévisualisation impossible');
        setPendingFile(null);
        return;
      }
      setPreview(json.data);
      setMsg(json.data.message ?? 'Prévisualisation prête');
    } catch {
      setMsg('Erreur prévisualisation');
      setPendingFile(null);
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!canEdit || !pendingFile) return;
    if ((preview?.totals.errors ?? 0) > 0) {
      setMsg('Import bloqué : corrigez les erreurs puis prévisualisez à nouveau.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', pendingFile);
      fd.append('dryRun', '0');
      const res = await fetch('/api/admin-backoffice/pricing/prix-matieres-stock/import-excel', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!json.ok) {
        setMsg(json.error ?? 'Erreur import');
        return;
      }
      const t = json.data.totals;
      setMsg(
        `Import OK — lus ${t.read}, créés ${t.created}, maj ${t.updated}, ignorés ${t.skipped}, erreurs ${t.errors}. POS resynchronisé.`,
      );
      setPreview(null);
      setPendingFile(null);
    } catch {
      setMsg('Erreur import multi-feuilles');
    } finally {
      setBusy(false);
    }
  }

  function cancelPreview() {
    setPreview(null);
    setPendingFile(null);
    setMsg('Prévisualisation annulée — aucune donnée écrite.');
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        Export / import multi-feuilles. L’import est <strong>atomique</strong> (tout ou rien) :
        prévisualisation obligatoire, confirmation uniquement si 0 erreur, sinon aucune écriture.
      </p>
      <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
        <li>01_Matieres_Stock — matières / stock</li>
        <li>02_Prix_Base / 02_Prix_Par_Contexte — MaterialContextPrice</li>
        <li>03_Impression_Sans_Finition — BasePrintingPrice + sync contexte</li>
        <li>FLYER_REGLES_PRIX — règles Flyer (ISF + pliage, sans grille matière) via onglet Flyers</li>
        <li>02_CARTERIE_FORMATS_IMPOSITION / 05_CARTERIE_REGLES_PRIX — via onglet Carterie</li>
        <li>04_Grand_Format — GrandFormatPricing</li>
        <li>05–13 — export (AVD, finitions, anomalies, chips…)</li>
      </ul>
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-sm space-y-1 dark:bg-blue-950/20 dark:border-blue-900">
        <p className="font-medium text-blue-800 dark:text-blue-300">📋 Référentiels Catalogue 2026</p>
        <p className="text-blue-700 dark:text-blue-400 text-xs">
          <strong>Matières</strong> : <code>catalogue-2026-prix-exacts.xlsx</code> → onglet Catalogue 2026 (papiers, bâches, vinyles).
          <br />
          <strong>Articles</strong> : <code>catalogue-articles-prix-imprimes-exacts-2026.xlsx</code> (280 lignes ART-xxx) → Prix articles / bouton Appliquer.
          Roll-up, stylo, flyers, CV… = articles, jamais matières. Export → modifier → réimporter met à jour le POS.
        </p>
      </div>
      {msg && (
        <p className={`text-sm ${(preview?.totals.errors ?? 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
          {msg}
        </p>
      )}
      {preview && (
        <div className="rounded-lg border overflow-auto max-h-56">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 sticky top-0">
              <tr className="text-left">
                <th className="p-2">Feuille</th>
                <th className="p-2 text-right">Lues</th>
                <th className="p-2 text-right">Créations</th>
                <th className="p-2 text-right">Maj</th>
                <th className="p-2 text-right">Ignorées</th>
                <th className="p-2 text-right">Erreurs</th>
              </tr>
            </thead>
            <tbody>
              {preview.reports.map((r) => (
                <tr key={r.sheet} className="border-t border-border/40">
                  <td className="p-2 font-mono">{r.sheet}</td>
                  <td className="p-2 text-right">{r.read}</td>
                  <td className="p-2 text-right">{r.created}</td>
                  <td className="p-2 text-right">{r.updated}</td>
                  <td className="p-2 text-right">{r.skipped}</td>
                  <td className={`p-2 text-right ${r.errors.length ? 'text-red-600 font-medium' : ''}`}>
                    {r.errors.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.reports.some((r) => r.errors.length > 0) && (
            <ul className="p-2 text-xs text-red-600 space-y-0.5 border-t max-h-24 overflow-auto">
              {preview.reports.flatMap((r) =>
                r.errors.slice(0, 8).map((e, i) => (
                  <li key={`${r.sheet}-${i}`}>
                    {r.sheet} L{e.line} : {e.reason}
                  </li>
                )),
              )}
            </ul>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void downloadTemplate()}>
          Télécharger modèle Excel
        </Button>
        <Button type="button" disabled={busy} onClick={() => void exportComplet()}>
          Export complet multi-feuilles
        </Button>
        {canEdit && !preview && (
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer rounded-lg border px-3 py-2 hover:border-primary/50">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void previewImport(f);
                e.target.value = '';
              }}
            />
            {busy ? 'Analyse…' : 'Importer Excel (prévisualiser)'}
          </label>
        )}
        {canEdit && preview && (
          <>
            <Button
              type="button"
              disabled={busy || preview.totals.errors > 0}
              onClick={() => void confirmImport()}
            >
              Confirmer l’import + sync POS
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={cancelPreview}>
              Annuler
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="rounded-[7px] border-0 bg-white px-3 py-3 shadow-[var(--shadow-card-unified)] dark:bg-[var(--bg-card)] dark:shadow-none">
      <p className="text-xs font-medium text-slate-600 dark:text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums text-slate-900 dark:text-foreground ${warn ? 'text-red-600 dark:text-red-400' : ''}`}>{value}</p>
    </div>
  );
}

function Catalogue2026Panel({ canEdit }: { canEdit: boolean }) {
  const [articlesMsg, setArticlesMsg] = useState<string | null>(null);
  const [articlesBusy, setArticlesBusy] = useState(false);

  async function applyArticles() {
    if (!canEdit) return;
    if (
      !window.confirm(
        'Appliquer Catalogue Articles 2026 (280 prix exacts) ?\nSync POS + archive roll-up/stylo hors matières.',
      )
    ) {
      return;
    }
    setArticlesBusy(true);
    setArticlesMsg(null);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/catalogue-articles-2026', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setArticlesMsg(d.error?.message ?? 'Erreur');
        return;
      }
      const a = d.data.articles;
      setArticlesMsg(
        `Articles : ${a.created} créés · ${a.updated} MAJ · ${a.synced} sync POS · matières archivées ${d.data.materialsArchived.count} · POS canoniques ${d.data.canonicalPosUpdated.count}`,
      );
    } finally {
      setArticlesBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Référentiel Catalogue 2026</h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Deux couches : <strong>matières de base</strong> (papiers, bâches, vinyles pour formules livres/GF)
          et <strong>articles à prix exacts</strong> (flyers, CV, roll-up, stylo…). Les produits finis ne restent jamais
          dans le tableau Matières.
        </p>
      </div>
      <Catalogue2026AuditPanel />
      <div className="rounded-lg border p-4 text-sm space-y-2">
        <p className="font-medium">Articles — prix imprimés exacts (280 variantes)</p>
        <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
          <li>Flyers, Cartes (PCB 200 Ar · PVC opaque 1 300 Ar), Plaques PVC/Plexi</li>
          <li>Textiles, Goodies (stylo 3 000 Ar…), PLV (Roll-up 150 000 Ar · X-Banner 85 000 Ar)</li>
          <li>Photo, Calendriers, Bloc-notes, Documents admin…</li>
          <li>Fichier : <code>docs/references/catalogue-articles-prix-imprimes-exacts-2026.xlsx</code></li>
        </ul>
        {canEdit && (
          <Button type="button" disabled={articlesBusy} onClick={() => void applyArticles()}>
            {articlesBusy ? 'Application…' : 'Appliquer Articles 2026 → Prix articles + POS'}
          </Button>
        )}
        {articlesMsg && <p className="text-xs text-emerald-700">{articlesMsg}</p>}
      </div>
      <div className="rounded-lg border p-4 text-sm space-y-1 bg-muted/30">
        <p className="font-medium">Matières de base (calcul personnalisé)</p>
        <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
          <li><strong>95 matières</strong> avec prix imprimé recto → <code>basePrintPrice</code></li>
          <li><strong>45 services / finitions</strong> → <code>FinishingPrice</code></li>
          <li><strong>65 matières</strong> sans tarif exact → anomalie <code>REF_2026_SANS_TARIF</code></li>
          <li>Export / import Excel aussi via <strong>Prix articles</strong></li>
        </ul>
      </div>
    </div>
  );
}
