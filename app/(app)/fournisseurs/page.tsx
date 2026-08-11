'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Building2, Plus, Phone, Mail, RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage, unwrapApiData } from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useHasPermission } from '@/lib/hooks/use-has-permission';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import {
  supplierToExcelRow,
  validateSuppliersExcelRows,
} from '@/lib/backoffice/suppliers-excel-format';
import {
  AppEmptyState, AppListSkeleton, AppButton,
  EntityDataToolbar, EntityListPageShell,
} from '@/components/ui/app-ui';
import {
  SupplierTableToolbar,
  SUPPLIER_CATEGORIES,
  type SupplierFilterChip,
  type SupplierSortId,
} from '@/components/suppliers/SupplierTableToolbar';
import '@/components/backoffice-v2/ui/admin-table.css';

type Supplier = {
  id: string; code: string; name: string; tel: string | null; email: string | null;
  ville: string | null; contact: string | null; categorie: string; statut: string;
  _count?: { purchaseOrders: number };
};

export default function FournisseursPage() {
  const [list, setList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<SupplierFilterChip>('all');
  const [sort, setSort] = useState<SupplierSortId>('name-asc');
  const debouncedSearch = useDebounce(search, 300);
  const canImportSuppliers = useHasPermission('fournisseurs:write');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [form, setForm] = useState({ name: '', tel: '', email: '', ville: '', contact: '', categorie: 'Papier', notes: '' });
  const excelIdsRef = useRef<Record<string, string>>({});

  const prepareExport = useCallback(async () => {
    const r = await fetch('/api/admin-backoffice/suppliers/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare-export' }),
    });
    const d = await r.json();
    if (r.ok && d.ok) excelIdsRef.current = d.data?.ids ?? {};
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (debouncedSearch.trim()) p.set('q', debouncedSearch.trim());
      if (activeChip === 'actif') p.set('statut', 'Actif');
      if (activeChip === 'inactif') p.set('statut', 'Inactif');
      if (SUPPLIER_CATEGORIES.includes(activeChip as typeof SUPPLIER_CATEGORIES[number])) {
        p.set('categorie', activeChip);
      }
      const r = await fetch(`/api/suppliers?${p}`);
      if (r.ok) setList(unwrapApiData<Supplier[]>(await r.json()));
    } catch { uxToast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, [debouncedSearch, activeChip]);

  useEffect(() => { void load(); }, [load]);

  const sortedList = useMemo(() => {
    const items = [...list];
    switch (sort) {
      case 'name-asc':
        items.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        break;
      case 'name-desc':
        items.sort((a, b) => b.name.localeCompare(a.name, 'fr'));
        break;
      case 'orders-desc':
        items.sort((a, b) => (b._count?.purchaseOrders ?? 0) - (a._count?.purchaseOrders ?? 0));
        break;
      default:
        break;
    }
    return items;
  }, [list, sort]);

  const create = async () => {
    if (saving) return;
    if (!form.name.trim()) return uxToast.error('Nom requis');
    setSaving(true);
    try {
      const r = await fetch('/api/suppliers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (r.ok) {
        uxToast.success('Fournisseur créé');
        setShowForm(false);
        setForm({ name: '', tel: '', email: '', ville: '', contact: '', categorie: 'Papier', notes: '' });
        void load();
      } else {
        const err = await r.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Erreur création'));
      }
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (id: string) => {
    const r = await fetch(`/api/suppliers/${id}`);
    if (!r.ok) return uxToast.error('Erreur chargement');
    const s = unwrapApiData<Supplier & { notes?: string }>(await r.json());
    setEditId(id);
    setForm({ name: s.name ?? '', tel: s.tel ?? '', email: s.email ?? '', ville: s.ville ?? '', contact: s.contact ?? '', categorie: s.categorie ?? 'Papier', notes: s.notes ?? '' });
  };

  const saveEdit = async () => {
    if (!editId || saving) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/suppliers/${editId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (r.ok) { uxToast.success('Fournisseur mis à jour'); setEditId(null); void load(); }
      else {
        const err = await r.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Erreur mise à jour'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityListPageShell
      className="fournisseurs-page"
      title="Fournisseurs"
      description="Partenaires approvisionnement — papier, encre, textile"
      icon={Building2}
      actions={
          <div className="flex flex-wrap gap-2">
            <AppButton variant="outline" size="sm" onClick={() => void load()} className="gap-2"><RefreshCw size={14} /> Actualiser</AppButton>
            <ExcelTableActions
              fileStem="fournisseurs"
              sheetName="Fournisseurs"
              validateRows={validateSuppliersExcelRows}
              canImport={canImportSuppliers}
              onBeforeExport={prepareExport}
              getExportRows={() =>
                sortedList.map((s) =>
                  supplierToExcelRow(s, excelIdsRef.current[s.id] ?? null),
                )
              }
              onImportRows={async (rows, ctx) => {
                const r = await fetch('/api/admin-backoffice/suppliers/import-excel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rows, fileName: ctx?.fileName }),
                });
                const d = await r.json();
                if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
                await load();
                return d.data;
              }}
            />
            <EntityDataToolbar
              trash={showTrash}
              onTrashChange={setShowTrash}
              canImport={false}
              canExport={false}
            />
            <AppButton size="sm" onClick={() => setShowForm(true)} className="gap-2"><Plus size={14} /> Nouveau</AppButton>
          </div>
      }
    >
      <SupplierTableToolbar
        count={sortedList.length}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        activeChip={activeChip}
        onChipChange={setActiveChip}
      />

      {loading ? <AppListSkeleton rows={4} /> : sortedList.length === 0 ? (
        <AppEmptyState icon={Building2} title="Aucun fournisseur" description="Ajoutez votre premier partenaire approvisionnement." />
      ) : (
        <div className="fournisseurs-grid">
          {sortedList.map((s) => {
            const initials = s.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? '')
              .join('');
            const orders = s._count?.purchaseOrders ?? 0;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => void openEdit(s.id)}
                className="fournisseur-card"
              >
                <div className="fournisseur-card__top">
                  <div className="fournisseur-card__avatar" aria-hidden>{initials || '?'}</div>
                  <div className="fournisseur-card__identity">
                    <p className="fournisseur-card__name truncate">{s.name}</p>
                    <p className="fournisseur-card__code">{s.code}</p>
                    <div className="fournisseur-card__badges">
                      <span className={`fournisseur-badge ${s.statut === 'Actif' ? 'fournisseur-badge--actif' : 'fournisseur-badge--inactif'}`}>
                        {s.statut}
                      </span>
                      <span className="fournisseur-badge fournisseur-badge--cat">{s.categorie}</span>
                    </div>
                  </div>
                </div>

                <ul className="fournisseur-card__meta">
                  {s.contact ? <li><span>{s.contact}</span></li> : null}
                  {s.ville ? <li><span>{s.ville}</span></li> : null}
                  {s.tel ? (
                    <li>
                      <Phone size={12} aria-hidden className="shrink-0 opacity-70" />
                      <span>{s.tel}</span>
                    </li>
                  ) : null}
                  {s.email ? (
                    <li>
                      <Mail size={12} aria-hidden className="shrink-0 opacity-70" />
                      <span>{s.email}</span>
                    </li>
                  ) : null}
                  {!s.contact && !s.ville && !s.tel && !s.email ? (
                    <li><span>Coordonnées non renseignées</span></li>
                  ) : null}
                </ul>

                <div className="fournisseur-card__foot">
                  <span className="fournisseur-card__orders">
                    {orders} achat{orders !== 1 ? 's' : ''}
                  </span>
                  <span className="fournisseur-card__hint">Modifier →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-backdrop backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-[7px] p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">Nouveau fournisseur</h3>
            {(['name', 'contact', 'tel', 'email', 'ville'] as const).map((k) => (
              <input key={k} placeholder={k === 'name' ? 'Raison sociale *' : k.charAt(0).toUpperCase() + k.slice(1)}
                value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            ))}
            <select value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
              {SUPPLIER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="flex gap-2 pt-2">
              <AppButton onClick={() => void create()} disabled={saving} className="flex-1">Enregistrer</AppButton>
              <AppButton variant="outline" onClick={() => setShowForm(false)}>Annuler</AppButton>
            </div>
          </div>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-50 bg-backdrop backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditId(null)}>
          <div className="bg-card border border-border rounded-[7px] p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">Modifier le fournisseur</h3>
            {(['name', 'contact', 'tel', 'email', 'ville'] as const).map((k) => (
              <input key={k} placeholder={k === 'name' ? 'Nom de l\'entreprise *' : k.charAt(0).toUpperCase() + k.slice(1)}
                value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                className="fc" />
            ))}
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="fc min-h-[60px]" />
            <select value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))} className="fc">
              {SUPPLIER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="flex gap-2 pt-2">
              <AppButton onClick={() => void saveEdit()} disabled={saving} className="flex-1 ans-btn-primary">Enregistrer</AppButton>
              <AppButton variant="outline" onClick={() => setEditId(null)}>Annuler</AppButton>
            </div>
          </div>
        </div>
      )}
    </EntityListPageShell>
  );
}
