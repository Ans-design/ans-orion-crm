'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import '@/components/backoffice-v2/admin-backoffice.css';

type PromoRow = {
  id?: string;
  excelId?: string;
  articleId: string;
  articleLabel?: string;
  materialFamily: string;
  formatScope: string;
  discountType: string;
  discountValue: number;
  priceSource: string;
  active?: boolean;
  details?: string | null;
};

export default function ReglesPromoArticlesPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/event-rules?kind=promo');
      const json = await res.json();
      if (json.ok) {
        setRows(json.data.rows ?? []);
        setColumns(json.data.columns ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function syncPos() {
    if (!canEdit) return;
    setMsg(null);
    const res = await fetch('/api/admin-backoffice/pricing/event-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync' }),
    });
    const json = await res.json();
    setMsg(json.ok ? 'Synchronisation POS OK' : (json.error ?? 'Erreur sync'));
  }

  return (
    <div className="ab2-shell max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Règles promotionnelles articles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Affiche événement / Calendrier plateau : −40 % sur Impression sans finition (Offset / PCM / PCB).
            Ne modifie pas le tarif ISF global.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void load()}>Actualiser</Button>
          {canEdit && (
            <Button type="button" onClick={() => void syncPos()}>Sync POS</Button>
          )}
        </div>
      </div>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {(columns.length ? columns : ['ARTICLE', 'FAMILLE', 'TYPE REMISE', 'VALEUR', 'SOURCE', 'ACTIF']).map((c) => (
                  <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id ?? r.articleId ?? i} className="border-t">
                  <td className="px-3 py-2">{r.excelId ?? '—'}</td>
                  <td className="px-3 py-2">{r.articleLabel ?? r.articleId}</td>
                  <td className="px-3 py-2">{r.materialFamily}</td>
                  <td className="px-3 py-2">{r.formatScope}</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">{r.discountType}</td>
                  <td className="px-3 py-2 font-medium">{r.discountValue}</td>
                  <td className="px-3 py-2">{r.priceSource}</td>
                  <td className="px-3 py-2">{r.active === false ? 'non' : 'oui'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.details ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
