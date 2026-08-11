'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Package } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapListItems, getApiErrorMessage } from '@/lib/api-client';
import { STOCK_CATEGORIES } from '@/lib/data/stock-categories';
import { AppButton } from '@/components/ui/app-ui';

type StockItem = {
  id: string;
  sku?: string | null;
  label: string;
  family?: string | null;
  quantity?: number;
  unit?: string;
  unitCost?: number | null;
  stockCategory?: string;
  supplierName?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  materialId?: string | null;
};

export function MaterialFromStockModal({ open, onClose, onImported, materialId }: Props) {
  const [category, setCategory] = useState('matiere_interne');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [basePrice, setBasePrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '80', category });
      if (search.trim()) qs.set('search', search.trim());
      const r = await fetch(`/api/stock/items?${qs}`, { cache: 'no-store' });
      if (!r.ok) {
        setItems([]);
        return;
      }
      setItems(unwrapListItems<StockItem>(await r.json()));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const importItem = async () => {
    if (!selected) return;
    if (materialId) {
      const r = await fetch(`/api/admin-backoffice/pricing/base-material-prices/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockItemId: selected.id,
          purchasePrice: selected.unitCost ?? null,
          basePrintPrice: basePrice ? Number(basePrice) : null,
          maxPrice: maxPrice ? Number(maxPrice) : null,
        }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Stock lié — brouillon enregistré');
        onImported();
        onClose();
      } else {
        uxToast.error(getApiErrorMessage(d, 'Liaison impossible'));
      }
      return;
    }
    const r = await fetch('/api/admin-backoffice/materials/from-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockItemId: selected.id,
        basePrintPrice: basePrice ? Number(basePrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      }),
    });
    const d = await r.json();
    if (r.ok && d.ok) {
      uxToast.success('Matière créée depuis stock (brouillon)');
      onImported();
      onClose();
    } else {
      uxToast.error(getApiErrorMessage(d, 'Import impossible'));
    }
  };

  if (!open) return null;

  return (
    <div className="mp-modal-overlay">
      <div className="mp-modal mp-modal-wide">
        <header className="mp-modal-head">
          <div>
            <p className="mp-modal-kicker">Stock → Matières & prix de base</p>
            <h3 className="mp-modal-title">Ajouter depuis le stock</h3>
            <p className="mp-modal-desc">Sélectionnez un SKU, préremplissez les prix base et max, puis enregistrez le lien.</p>
          </div>
          <AppButton type="button" variant="ghost" onClick={onClose}>Fermer</AppButton>
        </header>

        <div className="mp-modal-filters">
          <div className="ab2-search-wrap ab2-search-wrap--wide">
            <Search className="h-3.5 w-3.5" />
            <input
              className="ab2-search-input"
              placeholder="SKU, libellé, famille, fournisseur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
            />
          </div>
          <select className="ab2-input ab2-filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {STOCK_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <AppButton type="button" variant="outline" onClick={() => void load()}>Rechercher</AppButton>
        </div>

        <div className="mp-stock-picker">
          {loading ? (
            <p className="mp-muted p-4">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="mp-muted p-4">Aucun article stock pour cette catégorie.</p>
          ) : (
            <table className="mp-stock-table">
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Sélection</span>
                  </th>
                  <th>SKU</th>
                  <th>Libellé</th>
                  <th>Famille</th>
                  <th>Stock</th>
                  <th>Unité</th>
                  <th>Prix achat</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={selected?.id === item.id ? 'is-selected' : ''}
                    onClick={() => {
                      setSelected(item);
                      if (item.unitCost != null) setBasePrice(String(Math.round(item.unitCost * 1.35)));
                    }}
                  >
                    <td>
                      <input type="radio" checked={selected?.id === item.id} readOnly />
                    </td>
                    <td className="font-mono text-xs">{item.sku ?? '—'}</td>
                    <td>{item.label}</td>
                    <td>{item.family ?? '—'}</td>
                    <td>{item.quantity ?? '—'}</td>
                    <td>{item.unit ?? '—'}</td>
                    <td>{item.unitCost != null ? `${Math.round(item.unitCost).toLocaleString('fr-FR')} Ar` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="mp-stock-selected">
            <Package className="h-4 w-4 text-primary" />
            <span className="font-semibold">{selected.label}</span>
            <span className="mp-muted font-mono text-xs">{selected.sku}</span>
            <label className="mp-inline-label">
              Prix base s/finition
              <input className="ab2-input" type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </label>
            <label className="mp-inline-label">
              Prix max
              <input className="ab2-input" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </label>
          </div>
        )}

        <footer className="mp-modal-foot">
          <AppButton type="button" variant="outline" onClick={onClose}>Annuler</AppButton>
          <AppButton type="button" variant="default" disabled={!selected} onClick={() => void importItem()}>
            {materialId ? 'Lier et enregistrer brouillon' : 'Créer matière depuis stock'}
          </AppButton>
        </footer>
      </div>
    </div>
  );
}
