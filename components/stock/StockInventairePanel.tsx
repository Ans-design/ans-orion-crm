'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Loader2, RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { OrionEmptyState } from '@/components/orion';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';

type InvItem = {
  id: string;
  sku: string;
  label: string;
  category: string;
  quantity: number;
  reservedQty: number | null;
  unit: string;
  minQty: number;
};

export function StockInventairePanel({ onDone }: { onDone?: () => void }) {
  const [items, setItems] = useState<InvItem[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/stock/inventaire')
      .then(async (r) => {
        if (!r.ok) throw new Error('load');
        const body = await r.json();
        const data = unwrapApiData<{ items: InvItem[] }>(body);
        return data?.items ?? [];
      })
      .then((list) => {
        setItems(list);
        const init: Record<string, string> = {};
        for (const it of list) init[it.id] = String(it.quantity);
        setCounts(init);
      })
      .catch(() => {
        setItems([]);
        uxToast.error('Impossible de charger l\'inventaire');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const driftCount = useMemo(() => {
    let n = 0;
    for (const it of items) {
      const counted = Number(counts[it.id]);
      if (Number.isFinite(counted) && counted !== it.quantity) n += 1;
    }
    return n;
  }, [items, counts]);

  const submit = async () => {
    const lines = items
      .map((it) => ({
        stockItemId: it.id,
        countedQty: Number(counts[it.id]),
      }))
      .filter((l) => Number.isFinite(l.countedQty) && l.countedQty !== items.find((i) => i.id === l.stockItemId)?.quantity);

    if (lines.length === 0) {
      uxToast.info('Aucun écart à enregistrer');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/stock/inventaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, notes: 'Inventaire physique atelier' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        uxToast.error(getApiErrorMessage(body, 'Échec inventaire'));
        return;
      }
      const data = unwrapApiData<{ adjusted: number; skipped: number; sessionId: string; errors: unknown[] }>(body);
      uxToast.success(
        `Inventaire ${data?.sessionId ?? ''} — ${data?.adjusted ?? 0} ajusté(s)`,
      );
      onDone?.();
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="stock-inv flex justify-center p-10">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <OrionEmptyState
        icon={ClipboardCheck}
        title="Aucun article actif"
        description="Créez des matières stock avant de lancer un inventaire physique."
      />
    );
  }

  return (
    <div className="stock-inv">
      <div className="stock-inv__header">
        <div className="stock-inv__intro">
          <div className="stock-inv__icon" aria-hidden>
            <ClipboardCheck size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="stock-inv__title">Inventaire physique</h3>
            <p className="stock-inv__desc">
              Saisissez la quantité comptée — seuls les écarts génèrent un mouvement.
            </p>
          </div>
        </div>
        <div className="stock-inv__actions">
          {driftCount > 0 ? (
            <span className="stock-inv__drift-badge">{driftCount} écart{driftCount > 1 ? 's' : ''}</span>
          ) : null}
          <AppButton type="button" variant="outline" size="sm" onClick={load} className="gap-1">
            <RefreshCw size={12} /> Recharger
          </AppButton>
          <AppButton type="button" size="sm" onClick={submit} disabled={saving || driftCount === 0}>
            {saving ? 'Enregistrement…' : 'Valider les écarts'}
          </AppButton>
        </div>
      </div>

      <div className="stock-inv-grid">
        {items.map((it) => {
          const counted = Number(counts[it.id]);
          const drift = Number.isFinite(counted) && counted !== it.quantity;
          const delta = drift ? counted - it.quantity : 0;
          return (
            <article
              key={it.id}
              className={`stock-inv-card${drift ? ' stock-inv-card--drift' : ''}`}
            >
              <div className="stock-inv-card__top">
                <span className="stock-inv-card__sku">{it.sku}</span>
                <span className="stock-inv-card__unit">{it.unit}</span>
              </div>
              <h4 className="stock-inv-card__label">{it.label}</h4>
              {it.category ? (
                <p className="stock-inv-card__cat">{it.category}</p>
              ) : null}

              <div className="stock-inv-card__qty">
                <div className="stock-inv-field">
                  <span className="stock-inv-field__lab">Théorique</span>
                  <span className="stock-inv-field__val tabular-nums">{it.quantity}</span>
                </div>
                <div className="stock-inv-field stock-inv-field--input">
                  <label className="stock-inv-field__lab" htmlFor={`inv-count-${it.id}`}>
                    Compté
                  </label>
                  <input
                    id={`inv-count-${it.id}`}
                    type="number"
                    min={0}
                    step="any"
                    className="stock-inv-input"
                    value={counts[it.id] ?? ''}
                    onChange={(e) => setCounts((c) => ({ ...c, [it.id]: e.target.value }))}
                    aria-label={`Compté ${it.sku}`}
                  />
                </div>
              </div>

              {drift ? (
                <p className={`stock-inv-card__delta${delta > 0 ? ' is-plus' : ' is-minus'}`}>
                  Écart {delta > 0 ? '+' : ''}{delta} {it.unit}
                </p>
              ) : (
                <p className="stock-inv-card__ok">Conforme</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
