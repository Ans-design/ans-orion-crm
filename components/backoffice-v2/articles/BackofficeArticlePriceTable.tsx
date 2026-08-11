'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { uxToast } from '@/lib/ux/feedback';
import type { ArticlePriceTableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import { BackofficeDataTable, useArticleTableViews, type TableDensity } from '../ui/BackofficeDataTable';
import { ArticleTableToolbar, type ArticleFilterChip, type ArticleSortId } from './ArticleTableToolbar';
import {
  AdminAnomalySummary,
  AdminArticleCell,
  AdminPosSwitch,
  AdminPriceCell,
  AdminRowActionsMenu,
  AdminStackCell,
  AdminTableBadge,
} from '../ui/AdminTablePrimitives';
import { ArticleDetailDrawer } from '../drawers/ArticleDetailDrawer';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type Props = {
  canEdit: boolean;
  initialArticleId?: string | null;
};

type DraftRow = Partial<Pick<ArticlePriceTableRow, 'prixBase' | 'qtyMin' | 'status' | 'active'>>;

type FilterChip = ArticleFilterChip;

function publicationBadge(status: ArticlePriceTableRow['publicationStatus']) {
  if (status === 'synced') return { kind: 'published' as const, label: adminStatusLabel('published') };
  if (status === 'draft') return { kind: 'draft' as const, label: adminStatusLabel('draft') };
  return { kind: 'unpublished' as const, label: adminStatusLabel('archived') };
}

export function BackofficeArticlePriceTable({ canEdit, initialArticleId }: Props) {
  const [rows, setRows] = useState<ArticlePriceTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('all');
  const [chip, setChip] = useState<FilterChip>('all');
  const [sort, setSort] = useState<ArticleSortId>('name-asc');
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drawerRow, setDrawerRow] = useState<ArticlePriceTableRow | null>(null);
  const [density, setDensity] = useState<TableDensity>('standard');
  const viewPresets = useArticleTableViews();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      const r = await fetch(`/api/admin-backoffice/articles-price-table?${qs}`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) {
        const list: ArticlePriceTableRow[] = d.data.rows ?? [];
        setRows(list);
        if (initialArticleId) {
          const found = list.find((x) => x.articleId === initialArticleId);
          if (found) setDrawerRow(found);
        }
      } else uxToast.error(d.error?.message ?? 'Erreur tableau');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [search, initialArticleId]);

  useEffect(() => {
    const t = window.setTimeout(load, search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, search]);

  const families = useMemo(() => {
    const set = new Set(rows.map((r) => r.family).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (family !== 'all') out = out.filter((r) => r.family === family);
    if (chip === 'missingPrice') out = out.filter((r) => r.prixBase == null);
    if (chip === 'unlinked') out = out.filter((r) => r.materialCount === 0);
    if (chip === 'draft') out = out.filter((r) => r.publicationStatus === 'draft' || r.status === 'draft');
    if (chip === 'published') out = out.filter((r) => r.status === 'published');
    if (chip === 'archived') out = out.filter((r) => r.status === 'archived');
    if (chip === 'pos') out = out.filter((r) => r.visiblePos);
    if (chip === 'anomalies') out = out.filter((r) => r.anomalyCritical + r.anomalyWarning > 0);
    return out;
  }, [rows, family, chip]);

  const sortedRows = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case 'name-asc':
        list.sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr'));
        break;
      case 'name-desc':
        list.sort((a, b) => b.articleLabel.localeCompare(a.articleLabel, 'fr'));
        break;
      case 'family-asc':
        list.sort((a, b) => a.family.localeCompare(b.family, 'fr'));
        break;
      case 'price-asc':
        list.sort((a, b) => (a.prixBase ?? 0) - (b.prixBase ?? 0));
        break;
      case 'price-desc':
        list.sort((a, b) => (b.prixBase ?? 0) - (a.prixBase ?? 0));
        break;
      default:
        break;
    }
    return list;
  }, [filtered, sort]);

  const setDraft = (articleId: string, patch: DraftRow) => {
    setDrafts((prev) => ({ ...prev, [articleId]: { ...prev[articleId], ...patch } }));
  };

  const saveRow = useCallback(async (articleId: string) => {
    const patch = drafts[articleId];
    if (!patch || !canEdit) return;
    setSavingId(articleId);
    try {
      const r = await fetch(`/api/admin-backoffice/articles-price-table/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Ligne enregistrée');
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[articleId];
          return next;
        });
        load();
      } else uxToast.error(d.error?.message ?? 'Erreur sauvegarde');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setSavingId(null);
    }
  }, [canEdit, drafts, load]);

  const columns = useMemo<ColumnDef<ArticlePriceTableRow, unknown>[]>(() => [
    {
      id: 'article',
      accessorKey: 'articleLabel',
      header: 'Article',
      meta: { headerClassName: 'col-article', cellClassName: 'col-article' },
      cell: ({ row }) => (
        <AdminArticleCell
          icon={row.original.icon}
          title={row.original.articleLabel}
          subtitle={`Réf. ${row.original.articleId}`}
        />
      ),
    },
    {
      id: 'articleId',
      accessorKey: 'articleId',
      header: 'Réf.',
      meta: { headerClassName: 'col-ref-only' },
    },
    {
      id: 'family',
      accessorKey: 'family',
      header: 'Famille',
      meta: { headerClassName: 'col-family', cellClassName: 'col-family' },
      cell: ({ getValue }) => (
        <span className="orion-admin-table-ellipsis" title={String(getValue())}>{String(getValue())}</span>
      ),
    },
    {
      id: 'material',
      header: 'Matière',
      meta: { headerClassName: 'col-material', cellClassName: 'col-material' },
      cell: ({ row }) => {
        const n = row.original.materialCount;
        if (n === 0) return <span className="orion-admin-table-muted">—</span>;
        return (
          <AdminStackCell
            line1={`${n} matière${n > 1 ? 's' : ''}`}
            line2={row.original.category}
          />
        );
      },
    },
    {
      id: 'status',
      header: 'Statut interne',
      meta: { headerClassName: 'col-status' },
      cell: ({ row }) => {
        const b = publicationBadge(row.original.publicationStatus);
        return <AdminTableBadge kind={b.kind} label={row.original.status} />;
      },
    },
    {
      id: 'visiblePos',
      header: 'POS',
      meta: { headerClassName: 'col-pos is-center', cellClassName: 'col-pos is-center' },
      cell: ({ row }) => (
        <AdminPosSwitch
          checked={row.original.visiblePos}
          disabled={!canEdit}
          label={row.original.visiblePos ? 'Visible POS' : 'Masqué POS'}
          onChange={(v) => setDraft(row.original.articleId, { active: v })}
        />
      ),
    },
    {
      id: 'calculationType',
      accessorKey: 'calculationType',
      header: 'Calcul',
      meta: { headerClassName: 'col-calc' },
    },
    {
      id: 'prixBase',
      header: 'Prix base',
      meta: { headerClassName: 'col-price is-numeric', cellClassName: 'col-price is-numeric' },
      cell: ({ row }) => {
        const d = drafts[row.original.articleId];
        const val = d?.prixBase !== undefined ? d.prixBase : row.original.prixBase;
        if (!canEdit) return <AdminPriceCell value={val} />;
        return (
          <input
            type="number"
            className="ab2-cell-input ab2-cell-input-num w-full max-w-[6rem] ml-auto block"
            value={val ?? ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(row.original.articleId, {
              prixBase: e.target.value === '' ? null : Number(e.target.value),
            })}
          />
        );
      },
    },
    {
      id: 'stockLinked',
      header: 'Stock lié',
      meta: { headerClassName: 'col-stock', cellClassName: 'col-stock' },
      cell: ({ row }) => (
        <AdminTableBadge
          kind={row.original.materialCount > 0 ? 'stock-linked' : 'stock-unlinked'}
          label={row.original.materialCount > 0 ? 'Lié' : 'Non lié'}
        />
      ),
    },
    {
      id: 'qtyMin',
      header: 'Qté min',
      meta: { headerClassName: 'col-qty is-numeric', cellClassName: 'is-numeric' },
      cell: ({ row }) => {
        const d = drafts[row.original.articleId];
        const val = d?.qtyMin !== undefined ? d.qtyMin : row.original.qtyMin;
        if (!canEdit) return val ?? '—';
        return (
          <input
            type="number"
            className="ab2-cell-input ab2-cell-input-num w-16 ml-auto block"
            value={val ?? ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(row.original.articleId, {
              qtyMin: e.target.value === '' ? null : Number(e.target.value),
            })}
          />
        );
      },
    },
    {
      id: 'tiersSummary',
      accessorKey: 'tiersSummary',
      header: 'Paliers',
      meta: { headerClassName: 'col-tiers' },
      cell: ({ getValue }) => (
        <span className="orion-admin-table-ellipsis" title={String(getValue() ?? '')}>
          {String(getValue() ?? '—')}
        </span>
      ),
    },
    {
      id: 'formulaStatus',
      header: 'Formule',
      meta: { headerClassName: 'col-formula' },
      cell: ({ row }) => {
        const b = row.original.formulaStatus === 'published' ? 'published' : row.original.formulaStatus === 'draft' ? 'draft' : 'muted';
        return (
          <AdminTableBadge
            kind={b}
            label={`${row.original.formulaStatus}${row.original.formulaVersion ? ` v${row.original.formulaVersion}` : ''}`}
          />
        );
      },
    },
    {
      id: 'prix2026Status',
      accessorKey: 'prix2026Status',
      header: 'PRIX 2026',
      meta: { headerClassName: 'col-prix2026' },
      cell: ({ row }) => (
        <AdminTableBadge
          kind={row.original.prix2026Status === 'migrated' ? 'published' : 'muted'}
          label={row.original.prix2026Status}
        />
      ),
    },
    {
      id: 'anomalyCritical',
      header: 'Anomalies',
      meta: { headerClassName: 'col-anomalies', cellClassName: 'col-anomalies' },
      cell: ({ row }) => (
        <AdminAnomalySummary
          critical={row.original.anomalyCritical}
          warning={row.original.anomalyWarning}
          primaryLabel={row.original.anomalyCritical > 0 ? 'Critique' : row.original.anomalyWarning > 0 ? 'À vérifier' : undefined}
        />
      ),
    },
    {
      id: 'publicationStatus',
      header: 'Statut',
      meta: { headerClassName: 'col-status', cellClassName: 'col-status' },
      cell: ({ row }) => {
        const b = publicationBadge(row.original.publicationStatus);
        return <AdminTableBadge kind={b.kind} label={b.label} />;
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { headerClassName: 'col-actions', cellClassName: 'col-actions is-center' },
      cell: ({ row }) => {
        const isDirty = Boolean(drafts[row.original.articleId] && Object.keys(drafts[row.original.articleId]!).length);
        const actions = [
          { id: 'view', label: 'Voir détail', onClick: () => setDrawerRow(row.original) },
          { id: 'edit', label: 'Modifier', onClick: () => setDrawerRow(row.original) },
          ...(isDirty && canEdit ? [{
            id: 'save',
            label: savingId === row.original.articleId ? 'Enregistrement…' : 'Enregistrer',
            onClick: () => saveRow(row.original.articleId),
          }] : []),
        ];
        return <AdminRowActionsMenu actions={actions} />;
      },
    },
  ], [canEdit, drafts, saveRow, savingId]);

  return (
    <div>
      <ArticleTableToolbar
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
      />

      <BackofficeDataTable
        data={sortedRows}
        columns={columns}
        rowKey={(r) => r.articleId}
        viewPresets={viewPresets}
        defaultViewId="essential"
        density={density}
        onDensityChange={setDensity}
        loading={loading}
        emptyMessage="Aucun article — vérifiez les filtres ou lancez Sync catalogue."
        onRowClick={(row) => setDrawerRow(row)}
        rowClassName={(row) => {
          const classes: string[] = [];
          if (drafts[row.articleId]) classes.push('is-dirty');
          if (row.anomalyCritical + row.anomalyWarning > 0) classes.push('has-anomaly');
          return classes.join(' ') || undefined;
        }}
      />

      <ArticleDetailDrawer
        row={drawerRow}
        canEdit={canEdit}
        onClose={() => setDrawerRow(null)}
        onUpdated={load}
      />
    </div>
  );
}
