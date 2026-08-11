'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';

type Addon = {
  id: string;
  name: string;
  price: number;
  unit: string;
  required: boolean;
  visiblePOS: boolean;
  active: boolean;
};

type Props = {
  articleId: string;
  articleName: string;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
};

export function DirectSaleAddonsPanel({ articleId, articleName, open, onClose, canEdit }: Props) {
  const [rows, setRows] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/admin-backoffice/direct-sale/articles/${articleId}/addons`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows((d.data.rows ?? []).filter((a: Addon) => a.active));
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [articleId, open]);

  useEffect(() => { void load(); }, [load]);

  const addAddon = async () => {
    const name = newName.trim();
    const price = Number(newPrice) || 0;
    if (!name) return;
    try {
      const r = await fetch(`/api/admin-backoffice/direct-sale/articles/${articleId}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Ajout impossible');
      uxToast.success('Supplément ajouté et synchronisé POS');
      setNewName('');
      setNewPrice('');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const removeAddon = async (addonId: string) => {
    try {
      const r = await fetch(`/api/admin-backoffice/direct-sale/articles/${articleId}/addons/${addonId}`, {
        method: 'DELETE',
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Suppression impossible');
      uxToast.success('Supplément retiré');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[7px] border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-bold text-sm">Suppléments</p>
            <p className="text-xs text-muted-foreground">{articleName}</p>
          </div>
          <AppButton type="button" onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X size={16} />
          </AppButton>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <LoadingState message="Chargement…" size="sm" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun supplément — ajoutez des options payantes (vernis, coins arrondis…).</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="font-medium">{a.name}</span>
                  <span className="font-mono text-xs">{a.price.toLocaleString('fr-FR')} Ar / {a.unit}</span>
                  {canEdit && (
                    <button type="button" onClick={() => void removeAddon(a.id)} className="text-red-500 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <input
                type="text"
                placeholder="Nom supplément"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded border border-border px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                placeholder="Prix"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-24 rounded border border-border px-2 py-1.5 text-sm text-right"
              />
              <AppButton type="button" variant="default" onClick={() => void addAddon()} className="text-sm px-3">
                <Plus size={14} />
              </AppButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
