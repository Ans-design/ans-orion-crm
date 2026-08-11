'use client';

/**
 * @deprecated Remplacé par `BaseMaterialPricesTable` (Matières & prix de base unifié).
 * Conservé pour compatibilité legacy — ne pas utiliser dans les nouveaux écrans.
 * @see components/backoffice-v2/pricing-custom/BaseMaterialPricesTable.tsx
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { uxToast } from '@/lib/ux/feedback';
import type { MaterialDto, MaterialsStatsDto } from '@/lib/server/modules/pricing/base-material.dto';
import { OptionsEmptyState } from '../options/OptionsEmptyState';
import { OptionsLoadingState } from '../options/OptionsLoadingState';
import { MaterialCreateModal } from '../materials/MaterialCreateModal';
import { MaterialRowActions, MaterialAnomalyBadge } from '../materials/MaterialRowActions';
import { MaterialUsageDrawer } from '../materials/MaterialUsageDrawer';

type Props = { canEdit: boolean };

type LoadResult = {
  materials: MaterialDto[];
  stats: MaterialsStatsDto;
  tableReady: boolean;
};

async function fetchMaterials(sync: boolean): Promise<LoadResult> {
  const qs = sync ? '?sync=1&autoSync=1' : '?autoSync=1';
  const r = await fetch(`/api/admin-backoffice/pricing/base-materials${qs}`, { cache: 'no-store' });
  let d: {
    ok?: boolean;
    data?: { materials?: MaterialDto[]; rows?: MaterialDto[]; stats?: MaterialsStatsDto; tableReady?: boolean };
    error?: { message?: string } | string;
  };
  try {
    d = await r.json();
  } catch {
    throw new Error('Réponse serveur invalide');
  }

  if (!r.ok || d.ok === false) {
    const msg =
      typeof d.error === 'object' && d.error?.message
        ? d.error.message
        : typeof d.error === 'string'
          ? d.error
          : 'Impossible de charger les matières';
    throw new Error(msg);
  }

  const materials = d.data?.materials ?? d.data?.rows ?? [];
  return {
    materials,
    stats: d.data?.stats ?? {
      total: materials.length,
      active: 0,
      visiblePOS: 0,
      withPrice: 0,
      missingPrice: 0,
    },
    tableReady: d.data?.tableReady ?? true,
  };
}

export function BaseMaterialsTable({ canEdit }: Props) {
  const [rows, setRows] = useState<MaterialDto[]>([]);
  const [stats, setStats] = useState<MaterialsStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Partial<MaterialDto>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('all');
  const [filterMissingPrice, setFilterMissingPrice] = useState(false);
  const [filterAnomaly, setFilterAnomaly] = useState(false);
  const [usageRow, setUsageRow] = useState<MaterialDto | null>(null);
  const [usageData, setUsageData] = useState<Record<string, unknown> | null>(null);
  const loadGenRef = useRef(0);

  const load = useCallback(async (sync = false, showErrorToast = false) => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMaterials(sync);
      if (gen !== loadGenRef.current) return;
      setRows(result.materials);
      setStats(result.stats);
      setTableReady(result.tableReady);
    } catch (e) {
      if (gen !== loadGenRef.current) return;
      const msg = e instanceof Error ? e.message : 'Impossible de charger les matières';
      setError(msg);
      setRows([]);
      if (showErrorToast) {
        uxToast.error(msg);
      }
    } finally {
      if (gen === loadGenRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false, false);
  }, [load]);

  const families = useMemo(() => {
    const set = new Set(rows.map((r) => r.family).filter(Boolean) as string[]);
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.materialKey.toLowerCase().includes(q) ||
          (r.grammage ?? '').toLowerCase().includes(q),
      );
    }
    if (family !== 'all') out = out.filter((r) => r.family === family);
    if (filterMissingPrice) out = out.filter((r) => r.basePrintPrice == null && r.maxPrice == null);
    if (filterAnomaly) out = out.filter((r) => r.anomaliesCount > 0);
    return out;
  }, [rows, search, family, filterMissingPrice, filterAnomaly]);

  const setDraft = (id: string, patch: Partial<MaterialDto>) => {
    setDrafts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  };

  const val = (row: MaterialDto, key: keyof MaterialDto) => {
    const d = drafts[row.id];
    if (d && key in d) return d[key as keyof typeof d];
    return row[key];
  };

  const save = async (id: string) => {
    if (!canEdit || !drafts[id]) return;
    setSavingId(id);
    const patch = drafts[id];
    try {
      const r = await fetch(`/api/admin-backoffice/pricing/base-materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grammage: patch.grammage,
          unitDisplay: patch.unitDisplay,
          unitStandard: patch.unitStandard,
          conversionFactor: patch.conversionFactor,
          purchasePrice: patch.purchasePrice,
          basePrintPrice: patch.basePrintPrice,
          maxPrice: patch.maxPrice,
          targetMargin: patch.marginTarget,
          minMargin: patch.marginMin,
        }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Matière enregistrée');
        setDrafts((p) => { const n = { ...p }; delete n[id]; return n; });
        load(false, false);
      } else {
        const errMsg = typeof d.error === 'object' ? d.error?.message : d.error;
        uxToast.error(errMsg ?? 'Erreur sauvegarde');
      }
    } finally {
      setSavingId(null);
    }
  };

  const viewUsage = async (row: MaterialDto) => {
    setUsageRow(row);
    const r = await fetch(`/api/admin-backoffice/pricing/base-materials/${row.id}/usage`);
    const d = await r.json();
    setUsageData(d.ok ? d.data : null);
  };

  const handleSync = () => load(true, true);

  if (loading) return <OptionsLoadingState variant="table" rows={8} />;

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
        <p className="mb-1 font-medium text-red-200">Impossible de charger les matières</p>
        <p className="mb-4 text-sm text-red-300/80">{error}</p>
        <AppButton type="button" variant="default" onClick={() => load(false, true)}>
          <RefreshCw className="h-4 w-4" /> Réessayer
        </AppButton>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        {!tableReady && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Table Matières DB non initialisée — exécutez <code className="text-xs">npx prisma db push</code> puis Sync catalogue.
          </p>
        )}
        <OptionsEmptyState
          title="Aucune matière configurée pour le moment."
          description="Synchronisez le catalogue officiel pour créer les matières de base utilisées par le POS."
        />
        {canEdit && (
          <>
            <MaterialCreateModal canEdit={canEdit} onCreated={() => load(true, false)} />
            <AppButton type="button" variant="outline" className="ml-2" onClick={handleSync}>
              <RefreshCw className="h-4 w-4" /> Sync catalogue
            </AppButton>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {!tableReady && (
        <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Affichage depuis le catalogue officiel — table DB non disponible. Exécutez{' '}
          <code className="text-xs">npx prisma db push</code> puis redémarrez le serveur.
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AppButton type="button" variant="outline" onClick={handleSync}>
          <RefreshCw className="h-4 w-4" /> Sync catalogue
        </AppButton>
        <MaterialCreateModal canEdit={canEdit} onCreated={() => load(true, false)} />
        <input
          className="ab2-input min-w-[180px]"
          placeholder="Rechercher matière…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="ab2-input" value={family} onChange={(e) => setFamily(e.target.value)}>
          {families.map((f) => (
            <option key={f} value={f}>{f === 'all' ? 'Toutes familles' : f}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={filterMissingPrice} onChange={(e) => setFilterMissingPrice(e.target.checked)} />
          Prix manquant
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={filterAnomaly} onChange={(e) => setFilterAnomaly(e.target.checked)} />
          Anomalie
        </label>
        {stats && (
          <>
            <span className="ab2-badge">{stats.total} matières</span>
            <span className="ab2-badge">{filtered.length} affichées</span>
            {stats.missingPrice > 0 && (
              <span className="ab2-badge ab2-badge-warning">{stats.missingPrice} sans prix base</span>
            )}
          </>
        )}
      </div>
      <div className="orion-admin-table-card">
        <div className="orion-admin-table-scroll overflow-x-auto">
        <table className="ab2-table orion-admin-table text-sm">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Famille</th>
              <th>Grammage</th>
              <th>Unité aff.</th>
              <th>Conversion</th>
              <th>Std</th>
              <th>Prix achat</th>
              <th>Prix imp. sans finition</th>
              <th>Prix max</th>
              <th>Actif</th>
              <th>POS</th>
              <th>Statut</th>
              <th>Anomalies</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className={row.anomaliesCount > 0 ? 'has-anomaly' : undefined}>
                <td>{row.name}</td>
                <td>{row.family ?? '—'}</td>
                <td>
                  {canEdit ? (
                    <input
                      className="ab2-input w-20"
                      value={String(val(row, 'grammage') ?? '')}
                      onChange={(e) => setDraft(row.id, { grammage: e.target.value || null })}
                    />
                  ) : (row.grammage ?? '—')}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      className="ab2-input w-20"
                      value={String(val(row, 'unitDisplay') ?? '')}
                      onChange={(e) => setDraft(row.id, { unitDisplay: e.target.value || null })}
                    />
                  ) : (row.unitDisplay ?? row.unit ?? '—')}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      type="number"
                      className="ab2-input w-16"
                      value={Number(val(row, 'conversionFactor') ?? '') || ''}
                      onChange={(e) => setDraft(row.id, { conversionFactor: Number(e.target.value) || null })}
                    />
                  ) : (row.conversionFactor ?? '—')}
                </td>
                <td>{row.unitStandard ?? '—'}</td>
                <td>
                  {canEdit ? (
                    <input
                      type="number"
                      className="ab2-input w-24"
                      value={Number(val(row, 'purchasePrice') ?? '') || ''}
                      onChange={(e) => setDraft(row.id, { purchasePrice: Number(e.target.value) || null })}
                    />
                  ) : (row.purchasePrice ?? '—')}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      type="number"
                      className="ab2-input w-24"
                      value={Number(val(row, 'basePrintPrice') ?? '') || ''}
                      onChange={(e) => setDraft(row.id, { basePrintPrice: Number(e.target.value) || null })}
                    />
                  ) : (row.basePrintPrice ?? '—')}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      type="number"
                      className="ab2-input w-24"
                      value={Number(val(row, 'maxPrice') ?? '') || ''}
                      onChange={(e) => setDraft(row.id, { maxPrice: Number(e.target.value) || null })}
                    />
                  ) : (row.maxPrice ?? '—')}
                </td>
                <td>{row.active ? 'Oui' : 'Non'}</td>
                <td>{row.visiblePOS ? 'Oui' : 'Non'}</td>
                <td>
                  <span className={`ab2-badge ${row.publicationStatus === 'published' ? 'ab2-badge-success' : ''}`}>
                    {row.publicationStatus}
                  </span>
                </td>
                <td><MaterialAnomalyBadge anomalies={row.anomalies} /></td>
                <td>
                  <div className="flex flex-col gap-1">
                    <MaterialRowActions row={row} canEdit={canEdit} onChanged={() => load(false, false)} onViewUsage={viewUsage} />
                    {canEdit && drafts[row.id] && (
                      <AppButton
                        type="button"
                        variant="default"
                        className="text-xs"
                        disabled={savingId === row.id}
                        onClick={() => save(row.id)}
                      >
                        {savingId === row.id ? '…' : 'Enregistrer'}
                      </AppButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <MaterialUsageDrawer
        row={usageRow}
        usage={usageData as { linkedArticles?: Array<{ id: string; name: string }>; stockItem?: { label: string; quantity: number; unit: string } | null } | null}
        onClose={() => { setUsageRow(null); setUsageData(null); }}
      />
    </div>
  );
}
