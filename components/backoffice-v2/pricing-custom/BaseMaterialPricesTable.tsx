'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Upload,
} from 'lucide-react';
import type { DuplicateExcelIdGroup } from '@/lib/backoffice/material-excel-duplicate-ids';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { filterMasterDataRows } from '@/lib/backoffice/master-data-grouping';
import {
  buildCatalogLabel,
  characteristicToStorage,
  deriveMaterialTableFields,
  encodeSecondaryCharacteristic,
  isMaterialRowToVerify,
  type CharacteristicType,
} from '@/lib/backoffice/material-table-fields';
import { sortMaterialRows, type MaterialRowSortMode } from '@/lib/backoffice/material-row-sort';
import { isMaterialPrintPriceMissing } from '@/lib/backoffice/material-price-semantics';
import {
  MATERIAL_COLUMN_PRESETS,
  materialColumnsForPreset,
  materialColumnsWithHidden,
  type MaterialColumnPresetId,
} from '@/lib/backoffice/material-table-columns';
import type { MaterialPriceUnifiedRow } from './material-prices/types';
import { adminStatusFilterLabel } from '@/lib/administration/admin-ui-vocab';
import { OptionsLoadingState } from '../options/OptionsLoadingState';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { MaterialSheet, type MaterialSheetMode } from './material-prices/MaterialSheet';
import { MaterialFromStockModal } from './material-prices/MaterialFromStockModal';
import { ImpressionSfMigrationButton } from './material-prices/ImpressionSfMigrationButton';
import { MaterialTableToolbar, type MaterialFilterChip, type MaterialSortId } from './material-prices/MaterialTableToolbar';
import { MaterialNewMaterialMenu } from './material-prices/MaterialNewMaterialMenu';
import { MaterialMasterDataTable } from './MaterialMasterDataTable';
import { MaterialAnsAtTable } from './MaterialAnsAtTable';
import { MaterialFormatsWorkspace } from './MaterialSpecializedViews';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { AppButton } from '@/components/ui/app-ui';
import { materialRowToTableExport, MATERIAL_TABLE_EXPORT_COLUMNS } from '@/lib/backoffice/material-excel-format';
import { fillEmptyMaterialTariffs } from '@/lib/backoffice/material-tariff-fill';
import { validateMaterialExcelRows } from '@/lib/admin/excel-table';
import { resolveStockAlertLevel } from '@/lib/backoffice/material-master-row';
import { shouldListAsMaterial } from '@/lib/backoffice/material-vs-article';
import '@/components/admin/catalogue-prix-stock/matieres-tarifs-page.css';
import '@/components/admin/catalogue-prix-stock/ans-articles-table.css';

type UnifiedRow = MaterialPriceUnifiedRow;

type Stats = {
  total: number;
  missingPrice: number;
  linkedStock: number;
  published: number;
  draft: number;
  anomalies: number;
};

type FilterChip = MaterialFilterChip;

type Props = {
  canEdit: boolean;
  view?: 'all' | 'material_only' | 'article_prices';
  defaultChip?: FilterChip;
  characteristicFilter?: string | null;
  embedded?: boolean;
  onDataLoaded?: () => void;
  refreshToken?: number;
  /** Préréglage colonnes contrôlé (sous-vues studio matières). */
  columnPreset?: MaterialColumnPresetId;
  studioSubView?: string;
  /** Incrémente pour ouvrir la fiche unifiée en création. */
  createToken?: number;
  /** Ouvre la corbeille (hub Matières & tarifs). */
  onOpenCorbeille?: () => void;
  /**
   * false = Excel géré par MaterialsExcelBridge parent (évite double écoute des events).
   * @default true
   */
  mountExcelBridge?: boolean;
};

function applyPatchToRow(row: UnifiedRow, patch: Record<string, unknown>): UnifiedRow {
  const next = { ...row };
  if ('basePrintPrice' in patch) next.basePrintPrice = patch.basePrintPrice as number | null;
  if ('purchasePrice' in patch) next.purchasePrice = patch.purchasePrice as number | null;
  if ('blankSellPrice' in patch) {
    next.blankSellPrice = patch.blankSellPrice as number | null;
    if (!('maxPrice' in patch)) next.maxPrice = patch.blankSellPrice as number | null;
  }
  if ('maxPrice' in patch) {
    next.maxPrice = patch.maxPrice as number | null;
    if (!('blankSellPrice' in patch)) next.blankSellPrice = patch.maxPrice as number | null;
  }
  if ('family' in patch) next.family = patch.family as string;
  if ('label' in patch) next.name = patch.label as string;
  if ('materialKey' in patch) next.materialKey = patch.materialKey as string;
  if ('grammage' in patch) next.grammage = patch.grammage as string | null;
  if ('thickness' in patch) next.thickness = patch.thickness as string | null;
  if ('visiblePos' in patch) next.visiblePOS = patch.visiblePos as boolean;
  if ('saleUnit' in patch) next.unit = patch.saleUnit as string;
  if ('unitDisplay' in patch) next.unitDisplay = patch.unitDisplay as string | null;
  if ('publicationStatus' in patch) next.publicationStatus = patch.publicationStatus as string;
  if ('anomalyNotes' in patch) next.anomalyNotes = patch.anomalyNotes as string | null;
  if ('targetMargin' in patch) next.marginTarget = patch.targetMargin as number | null;
  if ('marginTarget' in patch) next.marginTarget = patch.marginTarget as number | null;
  return next;
}

export function BaseMaterialPricesTable({
  canEdit,
  view: viewProp = 'all',
  defaultChip = 'all',
  characteristicFilter = null,
  embedded = false,
  onDataLoaded,
  refreshToken = 0,
  columnPreset: columnPresetProp,
  studioSubView,
  createToken = 0,
  onOpenCorbeille,
  mountExcelBridge = true,
}: Props) {
  const view = embedded ? 'material_only' : viewProp;
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    missingPrice: 0,
    linkedStock: 0,
    published: 0,
    draft: 0,
    anomalies: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'ok' | 'low' | 'out'>('all');
  const [family, setFamily] = useState('all');
  const [chip, setChip] = useState<FilterChip>(defaultChip);
  const [sort, setSort] = useState<MaterialSortId>('logical');
  const initialPreset: MaterialColumnPresetId = columnPresetProp ?? 'essential';
  const [columnPreset, setColumnPreset] = useState<MaterialColumnPresetId>(initialPreset);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([
    ...MATERIAL_COLUMN_PRESETS[initialPreset].hiddenIds,
  ]);
  const [sheetRow, setSheetRow] = useState<UnifiedRow | null>(null);
  const [sheetMode, setSheetMode] = useState<MaterialSheetMode>('view');
  const [fromStockOpen, setFromStockOpen] = useState(false);
  const [linkStockRow, setLinkStockRow] = useState<UnifiedRow | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const loadGenRef = useRef(0);

  const load = useCallback(async (sync = false, bustCache = false) => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(null);
    try {
      const url = bustCache
        ? `/api/admin-backoffice/pricing/base-material-prices?_t=${Date.now()}`
        : '/api/admin-backoffice/pricing/base-material-prices';
      const r = await fetch(url, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(getApiErrorMessage(d, 'Chargement impossible'));
      if (gen !== loadGenRef.current) return;
      setRows(fillEmptyMaterialTariffs(d.data.rows ?? []));
      setStats(d.data.stats ?? { total: 0, missingPrice: 0, linkedStock: 0, published: 0, draft: 0, anomalies: 0 });
      onDataLoaded?.();
    } catch (e) {
      if (gen !== loadGenRef.current) return;
      setError(e instanceof Error ? e.message : 'Erreur');
      setRows([]);
    } finally {
      if (gen === loadGenRef.current) setLoading(false);
    }
    if (sync) {
      await fetch('/api/admin-backoffice/pricing/base-material-prices?sync=1', { cache: 'no-store' }).catch(() => null);
      await fetch('/api/admin-backoffice/pricing/base-materials?sync=1', { cache: 'no-store' }).catch(() => null);
      const r2 = await fetch(`/api/admin-backoffice/pricing/base-material-prices?_t=${Date.now()}`, { cache: 'no-store' });
      const d2 = await r2.json();
      if (r2.ok && d2.ok && gen === loadGenRef.current) {
        setRows(fillEmptyMaterialTariffs(d2.data.rows ?? []));
        setStats(d2.data.stats ?? { total: 0, missingPrice: 0, linkedStock: 0, published: 0, draft: 0, anomalies: 0 });
        onDataLoaded?.();
      }
    }
  }, [onDataLoaded]);

  /** Recharge depuis la DB uniquement — jamais de sync catalogue après import Excel */
  const refetchFromDb = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin-backoffice/pricing/base-material-prices?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(getApiErrorMessage(d, 'Chargement impossible'));
      if (gen !== loadGenRef.current) return;
      setRows(fillEmptyMaterialTariffs(d.data.rows ?? []));
      setStats(d.data.stats ?? { total: 0, missingPrice: 0, linkedStock: 0, published: 0, draft: 0, anomalies: 0 });
      onDataLoaded?.();
    } catch (e) {
      if (gen !== loadGenRef.current) return;
      const msg = e instanceof Error ? e.message : 'Erreur';
      setError(msg);
      throw e;
    } finally {
      if (gen === loadGenRef.current) setLoading(false);
    }
  }, [onDataLoaded]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!columnPresetProp) return;
    setColumnPreset(columnPresetProp);
    setHiddenColumnIds([...MATERIAL_COLUMN_PRESETS[columnPresetProp].hiddenIds]);
  }, [columnPresetProp, studioSubView]);

  useEffect(() => {
    setChip(defaultChip);
  }, [defaultChip, studioSubView]);

  useEffect(() => {
    if (refreshToken > 0) {
      void refetchFromDb().catch((e) => {
        uxToast.error(e instanceof Error ? e.message : 'Actualisation impossible');
      });
    }
  }, [refreshToken, refetchFromDb]);

  useEffect(() => {
    const onDataChanged = () => {
      void refetchFromDb().catch(() => {});
    };
    window.addEventListener('orion-matieres-data-changed', onDataChanged);
    return () => window.removeEventListener('orion-matieres-data-changed', onDataChanged);
  }, [refetchFromDb]);

  const families = useMemo(() => {
    const set = new Set(rows.map((r) => r.family).filter(Boolean) as string[]);
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (view === 'material_only') {
      out = out.filter(
        (r) =>
          r.rowKind === 'material'
          && !String(r.id).startsWith('print-')
          && !String(r.id).startsWith('catalog-')
          && shouldListAsMaterial({ label: r.name, family: r.family }),
      );
    }
    if (view === 'article_prices') out = out.filter((r) => r.rowKind === 'article_price');
    out = filterMasterDataRows(out, debouncedSearch);
    if (family !== 'all') out = out.filter((r) => r.family === family);
    if (chip === 'missingPrice') out = out.filter((r) => isMaterialPrintPriceMissing(r));
    if (chip === 'unlinked') out = out.filter((r) => !r.stockItemId);
    if (chip === 'draft') out = out.filter((r) => r.publicationStatus === 'draft');
    if (chip === 'published') out = out.filter((r) => r.publicationStatus === 'published');
    if (chip === 'pos') out = out.filter((r) => r.visiblePOS);
    if (chip === 'verify') {
      out = out.filter((r) => isMaterialRowToVerify(r));
    }
    if (stockFilter !== 'all') {
      out = out.filter((r) => {
        const qty = r.stockAvailable;
        const level = resolveStockAlertLevel(qty, r.stockThreshold);
        if (stockFilter === 'ok') return level === 'ok';
        if (stockFilter === 'low') return level === 'warn';
        return level === 'critical' || level === 'negative' || level === 'missing';
      });
    }
    if (characteristicFilter) {
      out = out.filter((r) => {
        const fields = deriveMaterialTableFields(r);
        const t = fields.mainCharacteristic?.type ?? '';
        if (characteristicFilter === 'grammage') return t === 'grammage';
        if (characteristicFilter === 'laize') return t === 'laize';
        if (characteristicFilter === 'format') return t === 'format';
        return true;
      });
    }
    return out;
  }, [rows, view, debouncedSearch, family, chip, stockFilter, characteristicFilter]);

  const hasActiveFilters =
    debouncedSearch !== '' || family !== 'all' || chip !== 'all' || stockFilter !== 'all';

  const sortedRows = useMemo(() => {
    const mode: MaterialRowSortMode = sort === 'logical' ? 'logical' : sort;
    return sortMaterialRows(filtered, mode);
  }, [filtered, sort]);

  const tableColumns = useMemo(() => {
    if (columnPreset === 'master' || columnPreset === 'unified') {
      const presetId = columnPreset === 'master' ? 'master' : 'unified';
      const ordered = materialColumnsForPreset(presetId);
      /** Master : jamais de liste vide → bascule sur la vue compacte (anti scroll 2800px). */
      const effectiveHidden =
        columnPreset === 'master' && hiddenColumnIds.length === 0
          ? MATERIAL_COLUMN_PRESETS.master.hiddenIds
          : hiddenColumnIds;
      const hidden = new Set(effectiveHidden);
      return ordered.filter((c) => !hidden.has(c.id));
    }
    return materialColumnsWithHidden(hiddenColumnIds);
  }, [hiddenColumnIds, columnPreset]);

  const isMasterTable = columnPreset === 'master';

  const filteredKpis = useMemo(() => ({
    total: filtered.length,
    published: filtered.filter((r) => r.publicationStatus === 'published').length,
    draft: filtered.filter((r) => r.publicationStatus === 'draft').length,
    missingPrice: filtered.filter((r) => isMaterialPrintPriceMissing(r)).length,
    unlinked: filtered.filter((r) => !r.stockItemId).length,
    anomalies: filtered.filter((r) => r.anomaliesCount > 0).length,
  }), [filtered]);

  /** KPI page Matières & tarifs (mockup). */
  const tarifsPageKpis = useMemo(() => {
    let stockOk = 0;
    let stockLow = 0;
    let stockValue = 0;
    let active = 0;
    for (const r of rows) {
      if (view === 'material_only') {
        if (r.rowKind !== 'material' || String(r.id).startsWith('print-') || String(r.id).startsWith('catalog-')) {
          continue;
        }
      }
      if (r.publicationStatus === 'published') active += 1;
      const qty = r.stockAvailable;
      const level = resolveStockAlertLevel(qty, r.stockThreshold);
      if (level === 'ok') stockOk += 1;
      if (level === 'warn') stockLow += 1;
      const unitCost = r.purchasePrice ?? r.lastPurchasePrice ?? 0;
      if (qty != null && qty > 0 && unitCost > 0) {
        stockValue += qty * unitCost;
      }
    }
    const stockPct = active > 0 ? Math.round((stockOk / Math.max(active, 1)) * 100) : 0;
    const valueLabel =
      stockValue >= 1_000_000
        ? `${(stockValue / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M Ar`
        : stockValue >= 1_000
          ? `${Math.round(stockValue / 1_000).toLocaleString('fr-FR')} k Ar`
          : `${Math.round(stockValue).toLocaleString('fr-FR')} Ar`;
    return { active, stockOk, stockLow, stockPct, valueLabel };
  }, [rows, view]);

  const handleColumnPresetChange = (id: MaterialColumnPresetId) => {
    setColumnPreset(id);
    setHiddenColumnIds([...MATERIAL_COLUMN_PRESETS[id].hiddenIds]);
  };

  const handleToggleColumn = (id: string) => {
    setHiddenColumnIds((prev) => {
      const base =
        columnPreset === 'master' && prev.length === 0
          ? [...MATERIAL_COLUMN_PRESETS.master.hiddenIds]
          : prev;
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    });
    if (columnPreset !== 'master') setColumnPreset('full');
  };

  /** Remet la vue compacte (pas « 27 colonnes » — évite le scroll horizontal). */
  const handleShowAllColumns = () => {
    setHiddenColumnIds([...MATERIAL_COLUMN_PRESETS.master.hiddenIds]);
    setColumnPreset('master');
  };

  const patchRow = async (row: UnifiedRow, patch: Record<string, unknown>) => {
    if (!canEdit) {
      throw new Error('Édition non autorisée');
    }

    const snapshot = row;
    setRows((prev) => prev.map((r) => (r.id === row.id ? applyPatchToRow(r, patch) : r)));
    setPendingIds((s) => new Set(s).add(row.id));

    try {
      const r = await fetch(`/api/admin-backoffice/pricing/base-material-prices/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, basePrintingPriceId: row.basePrintingPriceId }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(getApiErrorMessage(d, 'Sauvegarde impossible'));
    } catch (e) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? snapshot : r)));
      setPendingIds((s) => {
        const n = new Set(s);
        n.delete(row.id);
        return n;
      });
      throw e;
    }
  };

  const patchPrice = async (
    row: UnifiedRow,
    field: 'basePrintPrice' | 'purchasePrice' | 'blankSellPrice' | 'maxPrice',
    value: number | null,
  ) => {
    const apiField =
      field === 'basePrintPrice'
        ? 'basePrintPrice'
        : field === 'purchasePrice'
          ? 'purchasePrice'
          : field === 'blankSellPrice'
            ? 'blankSellPrice'
            : 'maxPrice';
    await patchRow(row, { [apiField]: value });
  };

  const patchCharacteristic = async (row: UnifiedRow, value: string, charType?: CharacteristicType) => {
    const fields = deriveMaterialTableFields(row);
    const type = charType ?? fields.mainCharacteristic?.type ?? 'grammage';
    const { grammage, thickness } = characteristicToStorage(type, value);
    const label = buildCatalogLabel(fields.materialName, type, value);
    await patchRow(row, { grammage, thickness, label });
  };

  const patchSecondaryCharacteristic = async (
    row: UnifiedRow,
    value: string,
    charType: CharacteristicType,
  ) => {
    await patchRow(row, {
      anomalyNotes: encodeSecondaryCharacteristic(charType, value, row.anomalyNotes),
    });
  };

  const exportableMaterialRows = useMemo(() => {
    /** Export = exactement la vue tableau filtrée / triée (comme Articles finis). */
    return sortedRows;
  }, [sortedRows]);

  const prepareExportMetadata = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/base-materials/excel-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare-export' }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      throw new Error(getApiErrorMessage(d, 'Préparation export impossible'));
    }
    await refetchFromDb();
  };

  const buildExportRows = () =>
    exportableMaterialRows.map((row) =>
      materialRowToTableExport(row) as unknown as Record<string, unknown>,
    );

  const importRows = async (
    incoming: Record<string, unknown>[],
    ctx?: { fileName?: string },
  ) => {
    const r = await fetch('/api/admin-backoffice/pricing/base-material-prices/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: incoming,
        fileName: ctx?.fileName ?? 'import-ui.xlsx',
        /**
         * Import UI : upsert uniquement par défaut.
         * replaceAll (archive des absents) = opt-in explicite — jamais silencieux.
         */
        syncMode: 'full',
        replaceAll: false,
      }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      throw new Error(getApiErrorMessage(d, 'Import impossible'));
    }
    const report = d.data as {
      read: number;
      created: number;
      updated: number;
      unchanged: number;
      archived: number;
      ignored: number;
      errors: number;
      dbActive: number;
      activeImported?: number;
      duplicateIds: number;
      duplicateIdGroups?: DuplicateExcelIdGroup[];
      issues: Array<{ line: number; field?: string; reason: string }>;
    };
    setSearch('');
    setChip('all');
    setFamily('all');
    await refetchFromDb();

    try {
      const syncRes = await fetch('/api/admin-backoffice/pricing/sync-pos', { method: 'POST' });
      const syncJson = await syncRes.json().catch(() => ({}));
      if (!syncRes.ok || !syncJson.ok) {
        uxToast.info('Tableau aligné sur Excel — sync POS partielle : vérifiez Synchroniser si besoin.');
      }
    } catch {
      uxToast.info('Tableau aligné sur Excel — sync POS à relancer si nécessaire.');
    }

    return report;
  };

  const publishAll = async () => {
    const r = await fetch('/api/admin-backoffice/pricing/base-material-prices/publish-all', { method: 'POST' });
    const d = await r.json();
    if (r.ok && d.ok) {
      uxToast.success('Toutes les matières brouillon publiées');
      setPendingIds(new Set());
      void load(false);
    } else {
      uxToast.error(getApiErrorMessage(d, 'Publication globale impossible'));
    }
  };

  const openSheet = (row: UnifiedRow, mode: MaterialSheetMode = 'view') => {
    setSheetRow(row);
    setSheetMode(mode);
  };

  const viewUsage = (row: UnifiedRow) => {
    openSheet(row, 'view');
  };

  /** Token « Nouvelle matière » → ouvre la fiche unifiée en création. */
  useEffect(() => {
    if (!createToken) return;
    setSheetRow(null);
    setSheetMode('create');
  }, [createToken]);

  const openCreateSheet = () => {
    setSheetRow(null);
    setSheetMode('create');
  };

  const closeSheet = () => {
    setSheetRow(null);
    setSheetMode('view');
  };

  const sheetOpen = sheetMode === 'create' || sheetRow != null;

  const refreshToolbar = (
    <button
      type="button"
      className="orion-material-toolbar-btn"
      title="Actualiser depuis la base"
      onClick={() => {
        void (async () => {
          try {
            setSearch('');
            setFamily('all');
            setChip('all');
            await refetchFromDb();
            uxToast.success('Données actualisées');
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Actualisation impossible';
            console.error('[Stock & Matières] actualiser', msg);
            uxToast.error(msg, 'Actualisation impossible');
          }
        })();
      }}
    >
      <RefreshCw className="h-3.5 w-3.5" />
      Actualiser
    </button>
  );

  const isFormatsView = studioSubView === 'formats-crud';
  const isSpecializedView = isFormatsView;
  /** Hub CPS : toolbar visible pour la table maîtresse (recherche, filtres, colonnes). */
  const showMaterialsToolbar = !isSpecializedView && (!embedded || isMasterTable);
  const matieresTarifsLayout = embedded && isMasterTable && !isSpecializedView;

  const materialTable = matieresTarifsLayout ? (
    <MaterialAnsAtTable
      rows={sortedRows}
      canEdit={canEdit}
      pendingIds={pendingIds}
      onPatchRow={async (row, patch) => {
        try {
          await patchRow(row, patch);
          uxToast.success('Enregistré');
          setPendingIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
        } catch (e) {
          uxToast.error(e instanceof Error ? e.message : 'Erreur');
          throw e;
        }
      }}
      onPatchPrice={async (row, field, value) => {
        try {
          await patchPrice(row, field, value);
          uxToast.success('Prix base enregistré');
          setPendingIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
        } catch (e) {
          uxToast.error(e instanceof Error ? e.message : 'Erreur');
          throw e;
        }
      }}
      onChanged={() => load(false)}
      onQuickEdit={(row) => openSheet(row, 'edit')}
      onViewDetails={(row) => openSheet(row, 'view')}
    />
  ) : (
    <MaterialMasterDataTable
      rows={sortedRows}
      columns={tableColumns}
      canEdit={canEdit}
      pendingIds={pendingIds}
      onPatchRow={async (row, patch) => {
        try {
          await patchRow(row, patch);
          uxToast.success('Enregistré');
          setPendingIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
        } catch (e) {
          uxToast.error(e instanceof Error ? e.message : 'Erreur');
          throw e;
        }
      }}
      onPatchPrice={async (row, field, value) => {
        try {
          await patchPrice(row, field, value);
          uxToast.success('Prix base enregistré');
          setPendingIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
        } catch (e) {
          uxToast.error(e instanceof Error ? e.message : 'Erreur');
          throw e;
        }
      }}
      onPatchCharacteristic={async (row, value, charType) => {
        try {
          await patchCharacteristic(row, value, charType);
          setPendingIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
        } catch (e) {
          uxToast.error(e instanceof Error ? e.message : 'Erreur');
          throw e;
        }
      }}
      onPatchSecondaryCharacteristic={async (row, value, charType) => {
        try {
          await patchSecondaryCharacteristic(row, value, charType);
          setPendingIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
        } catch (e) {
          uxToast.error(e instanceof Error ? e.message : 'Erreur');
          throw e;
        }
      }}
      onViewUsage={viewUsage}
      onLinkStock={(row) => { setLinkStockRow(row); setFromStockOpen(true); }}
      onChanged={() => load(false)}
      onQuickEdit={(row) => openSheet(row, 'edit')}
      onViewDetails={(row) => openSheet(row, 'view')}
      disableResponsiveColumns={isMasterTable}
    />
  );

  /** Pont Import/Export Excel (AdminHeader) — optionnel si MaterialsExcelBridge parent. */
  const excelImportBridge = mountExcelBridge ? (
    <ExcelTableActions
      fileStem="matieres-tarifs"
      sheetName="Matières"
      columns={MATERIAL_TABLE_EXPORT_COLUMNS}
      importMode="full"
      onBeforeExport={prepareExportMetadata}
      getExportRows={buildExportRows}
      canImport={canEdit}
      onImportRows={canEdit ? importRows : undefined}
      importTriggerEvent="orion-matieres-excel-import"
      exportTriggerEvent="orion-matieres-excel-export"
      validateRows={validateMaterialExcelRows}
      hiddenUi
    />
  ) : null;

  if (loading && rows.length === 0 && !isFormatsView) {
    return (
      <>
        {excelImportBridge}
        <OptionsLoadingState variant="table" rows={10} />
      </>
    );
  }

  if (error && rows.length === 0 && !isFormatsView) {
    return (
      <>
        {excelImportBridge}
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
          <p className="mb-4 text-sm text-red-300">{error}</p>
          <AppButton type="button" variant="default" onClick={() => load(true)}>
            <RefreshCw className="h-4 w-4" /> Réessayer
          </AppButton>
        </div>
      </>
    );
  }

  return (
    <div
      className={cn(
        'mp-workspace flex flex-col min-h-0',
        !embedded && 'min-h-[calc(100vh-12rem)]',
        isMasterTable && 'mp-workspace--master',
        matieresTarifsLayout && 'mt-page ans-at',
      )}
    >
      {excelImportBridge}
      {!embedded && !isSpecializedView && (
      <header className="mp-header mp-header-compact flex-shrink-0">
        <div>
          <p className="mp-header-kicker">Master Data · Matières</p>
          <p className="mp-header-desc">
            Prix base = prix matière/impression brute, hors finition et hors façonnage.
          </p>
        </div>
        <div className="mp-header-actions">
          <div className={`ab2-options-sync ${stats.draft > 0 ? 'is-dirty' : 'is-synced'}`}>
            <span className="ab2-options-sync-dot" />
            {stats.draft > 0 ? (
              <span>{stats.draft} matière{stats.draft > 1 ? 's' : ''} en brouillon</span>
            ) : (
              <span>Catalogue synchronisé</span>
            )}
          </div>
          {canEdit && stats.draft > 0 && (
            <AppButton type="button" variant="default" onClick={() => void publishAll()}>
              <Upload className="h-4 w-4" /> Publier tout
            </AppButton>
          )}
          <AppButton type="button" variant="outline" onClick={() => load(true)}>
            <RefreshCw className="h-4 w-4" /> Sync catalogue
          </AppButton>
          <ImpressionSfMigrationButton canEdit={canEdit} onMigrated={() => load(true)} />
        </div>
      </header>
      )}

      {!embedded && !isSpecializedView && (
      <div className={cn('mp-kpi-row flex-shrink-0', hasActiveFilters && 'is-filtered')}>
        <div className="mp-kpi">
          <strong>{filteredKpis.total}</strong>
          <span>{hasActiveFilters ? 'Résultats filtrés' : 'Total matières'}</span>
        </div>
        <div className="mp-kpi mp-kpi-success"><strong>{filteredKpis.published}</strong><span>Actives</span></div>
        <div className="mp-kpi mp-kpi-warn"><strong>{filteredKpis.draft}</strong><span>{adminStatusFilterLabel('draft')}</span></div>
        <div className="mp-kpi"><strong>{filteredKpis.missingPrice}</strong><span>Prix manquant</span></div>
        <div className="mp-kpi"><strong>{filteredKpis.unlinked}</strong><span>Non liées stock</span></div>
        <div className="mp-kpi mp-kpi-danger"><strong>{filteredKpis.anomalies}</strong><span>Anomalies</span></div>
      </div>
      )}

      {matieresTarifsLayout ? (
        <section className="mt-stats flex-shrink-0" aria-label="Indicateurs matières">
          <article className="mt-stat">
            <div className="mt-stat-icon" aria-hidden>▦</div>
            <div>
              <small>Références actives</small>
              <strong>{tarifsPageKpis.active.toLocaleString('fr-FR')}</strong>
            </div>
          </article>
          <article className="mt-stat">
            <div className="mt-stat-icon" aria-hidden>✓</div>
            <div>
              <small>Stock disponible</small>
              <strong>{tarifsPageKpis.stockOk.toLocaleString('fr-FR')}</strong>
              <em>{tarifsPageKpis.stockPct} %</em>
            </div>
          </article>
          <article className="mt-stat">
            <div className="mt-stat-icon" aria-hidden>!</div>
            <div>
              <small>Stock faible</small>
              <strong>{tarifsPageKpis.stockLow.toLocaleString('fr-FR')}</strong>
              <em className="is-warn">À surveiller</em>
            </div>
          </article>
          <article className="mt-stat">
            <div className="mt-stat-icon" aria-hidden>↗</div>
            <div>
              <small>Valeur du stock</small>
              <strong>{tarifsPageKpis.valueLabel}</strong>
            </div>
          </article>
        </section>
      ) : null}

      <div className={cn(matieresTarifsLayout && 'mt-workspace', 'flex flex-col min-h-0 flex-1')}>
      {showMaterialsToolbar ? (
      <MaterialTableToolbar
        count={sortedRows.length}
        search={search}
        onSearchChange={setSearch}
        families={families}
        family={family}
        onFamilyChange={setFamily}
        sort={sort}
        onSortChange={setSort}
        activeChip={chip}
        onChipChange={setChip}
        columnPreset={columnPreset}
        onColumnPresetChange={handleColumnPresetChange}
        hiddenColumnIds={hiddenColumnIds}
        onToggleColumn={handleToggleColumn}
        masterMode={isMasterTable}
        onShowAllColumns={handleShowAllColumns}
        stockFilter={stockFilter}
        onStockFilterChange={matieresTarifsLayout ? setStockFilter : undefined}
        onOpenCorbeille={matieresTarifsLayout ? onOpenCorbeille : undefined}
        onResetFilters={
          isMasterTable
            ? () => {
                setSearch('');
                setFamily('all');
                setChip('all');
                setStockFilter('all');
                setSort('logical');
              }
            : undefined
        }
        excelActions={
          embedded ? (
            /* Hub CPS / Matières & tarifs : Import via AdminHeader (écouteur racine). */
            <>
              {refreshToolbar}
              {canEdit && !matieresTarifsLayout ? (
                <MaterialNewMaterialMenu
                  canEdit={canEdit}
                  onCreated={() => void load(false)}
                  onFromStock={() => {
                    setLinkStockRow(null);
                    setFromStockOpen(true);
                  }}
                  onManualCreate={openCreateSheet}
                />
              ) : null}
            </>
          ) : (
            <>
              <ExcelTableActions
                fileStem="matieres-tarifs"
                sheetName="Matières"
                columns={MATERIAL_TABLE_EXPORT_COLUMNS}
                importMode="full"
                onBeforeExport={prepareExportMetadata}
                getExportRows={buildExportRows}
                canImport={canEdit}
                onImportRows={importRows}
                validateRows={validateMaterialExcelRows}
              />
              {refreshToolbar}
              {canEdit ? (
                <MaterialNewMaterialMenu
                  canEdit={canEdit}
                  onCreated={() => void load(false)}
                  onFromStock={() => {
                    setLinkStockRow(null);
                    setFromStockOpen(true);
                  }}
                  onManualCreate={openCreateSheet}
                />
              ) : null}
            </>
          )
        }
      />
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col">
        {error && rows.length > 0 && !isFormatsView ? (
          <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}
        {isFormatsView ? (
          <MaterialFormatsWorkspace canEdit={canEdit} />
        ) : sortedRows.length === 0 ? (
          <AdminEmptyState
            title="Aucune matière n’est encore rattachée au référentiel"
            description="Si des matières existent ailleurs (catalogue, Excel, stock), lancez « Compléter depuis le catalogue » ou importez depuis Stock / Excel. Ne pas confondre avec une erreur de charge (voir le bandeau rouge)."
          />
        ) : (
          materialTable
        )}
      </div>
      </div>

      <MaterialSheet
        open={sheetOpen}
        mode={sheetMode}
        row={sheetRow}
        canEdit={canEdit}
        onClose={closeSheet}
        onModeChange={setSheetMode}
        onSaved={(updated) => {
          if (updated?.id) {
            setSheetRow(updated);
            setRows((prev) => {
              const idx = prev.findIndex((r) => r.id === updated.id);
              if (idx < 0) return [updated, ...prev];
              const next = [...prev];
              next[idx] = { ...prev[idx], ...updated };
              return next;
            });
          }
          void load(true, true).then(() => {
            if (!updated?.id) return;
            setRows((prev) => {
              const fresh = prev.find((r) => r.id === updated.id);
              if (fresh) setSheetRow(fresh);
              return prev;
            });
          });
        }}
        onCreatedRow={(created) => {
          setSheetRow(created);
          setSheetMode('view');
        }}
        onLinkStock={
          sheetRow
            ? (row) => {
                setLinkStockRow(row);
                setFromStockOpen(true);
              }
            : undefined
        }
      />

      <MaterialFromStockModal
        open={fromStockOpen}
        onClose={() => { setFromStockOpen(false); setLinkStockRow(null); }}
        onImported={() => load(true)}
        materialId={linkStockRow?.id}
      />
    </div>
  );
}
